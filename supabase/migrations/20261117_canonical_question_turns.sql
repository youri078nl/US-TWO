-- US TWO: native questions inside the ONE canonical us_quest_games position.
-- Additive, idempotent migration. NO modifications to existing user game rows.
-- No access to the deprecated independent us_question_games position.
ALTER TABLE public.us_quest_games
  ADD COLUMN IF NOT EXISTS question_category text,
  ADD COLUMN IF NOT EXISTS question_prompt text,
  ADD COLUMN IF NOT EXISTS question_hard boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS question_answer text,
  ADD COLUMN IF NOT EXISTS question_asked_by uuid,
  ADD COLUMN IF NOT EXISTS question_number integer NOT NULL DEFAULT 0;

-- Keep old quest contract strict while allowing the two question subphases.
-- No active catalog item is allowed during a question turn.
ALTER TABLE public.us_quest_games DROP CONSTRAINT IF EXISTS us_quest_games_phase_check;
ALTER TABLE public.us_quest_games ADD CONSTRAINT us_quest_games_phase_check
 CHECK (phase IN ('choose','approval','active','question','question_review'));
ALTER TABLE public.us_quest_games DROP CONSTRAINT IF EXISTS quest_consistent;
ALTER TABLE public.us_quest_games ADD CONSTRAINT quest_consistent CHECK (
 ((phase IN ('choose','question','question_review')) AND active_catalog_id IS NULL AND proposer_id IS NULL AND mode IS NULL)
 OR ((phase IN ('approval','active')) AND active_catalog_id IS NOT NULL AND proposer_id IS NOT NULL AND mode IS NOT NULL)
);


-- Review/audit records store NO private free-text answer.
CREATE TABLE IF NOT EXISTS public.us_quest_question_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id uuid NOT NULL REFERENCES public.us_couples(id) ON DELETE CASCADE,
  asked_by uuid NOT NULL,
  approved_by uuid NOT NULL,
  category text NOT NULL,
  steps smallint NOT NULL CHECK(steps BETWEEN 1 AND 6),
  position_before integer NOT NULL CHECK(position_before>=0),
  position_after integer NOT NULL CHECK(position_after>position_before),
  approved_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.us_quest_question_results ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.us_quest_question_results FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.us_quest_question_state()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_pair uuid;
  v_game public.us_quest_games%rowtype;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'login_required' USING errcode='28000'; END IF;
  SELECT couple_id INTO v_pair FROM public.us_members WHERE user_id=v_uid;
  IF v_pair IS NULL OR (SELECT count(*) FROM public.us_members WHERE couple_id=v_pair)<>2
    THEN RETURN jsonb_build_object('paired',false,'initialized',false); END IF;
  SELECT * INTO v_game FROM public.us_quest_games WHERE couple_id=v_pair;
  IF NOT FOUND THEN RETURN jsonb_build_object('paired',true,'initialized',false); END IF;
  RETURN jsonb_build_object(
    'paired',true,'initialized',true,'revision',v_game.revision,'position',v_game.position,
    'phase',CASE WHEN v_game.phase IN ('question','question_review') THEN v_game.phase ELSE 'idle' END,
    'your_turn',v_game.turn_user=v_uid,
    'can_review',v_game.phase='question_review' AND v_game.question_asked_by<>v_uid,
    'category',v_game.question_category,'prompt',v_game.question_prompt,
    'hard',v_game.question_hard,'question_number',v_game.question_number,
    'answer',CASE WHEN v_game.phase='question_review' THEN v_game.question_answer ELSE NULL END
  );
END $$;

CREATE OR REPLACE FUNCTION public.us_quest_question_action(
 p_action text,p_expected_revision integer,p_request_id uuid,
 p_category text DEFAULT NULL,p_answer text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $$
DECLARE
 v_uid uuid:=auth.uid();v_pair uuid;v_game public.us_quest_games%rowtype;
 v_old jsonb;v_result jsonb;v_count integer;v_prompt text;v_hard boolean;
 v_partner uuid;v_steps integer;v_old_position integer;v_cell integer;
BEGIN
 IF v_uid IS NULL THEN RAISE EXCEPTION 'login_required' USING errcode='28000'; END IF;
 IF p_action IS NULL OR p_expected_revision IS NULL OR p_expected_revision<0 OR p_request_id IS NULL
  THEN RAISE EXCEPTION 'invalid_request' USING errcode='22023'; END IF;
 SELECT couple_id INTO v_pair FROM public.us_members WHERE user_id=v_uid;
 IF v_pair IS NULL OR (SELECT count(*) FROM public.us_members WHERE couple_id=v_pair)<>2
  THEN RAISE EXCEPTION 'pair_not_ready' USING errcode='22023'; END IF;
 -- Serialize all game/question/ordinary quest mutations on the same couple row.
 PERFORM 1 FROM public.us_couples WHERE id=v_pair FOR UPDATE;
 SELECT result INTO v_old FROM public.us_quest_events WHERE actor_id=v_uid AND request_id=p_request_id;
 IF FOUND THEN RETURN v_old; END IF;
 SELECT * INTO v_game FROM public.us_quest_games WHERE couple_id=v_pair FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'game_not_started' USING errcode='22023'; END IF;
 IF v_game.revision<>p_expected_revision THEN RAISE EXCEPTION 'stale_revision' USING errcode='40001'; END IF;
 SELECT user_id INTO v_partner FROM public.us_members WHERE couple_id=v_pair AND user_id<>v_uid LIMIT 1;
 IF v_partner IS NULL THEN RAISE EXCEPTION 'pair_not_ready' USING errcode='22023'; END IF;
 IF p_action='category' THEN
  IF v_game.phase<>'choose' OR v_game.turn_user<>v_uid
   THEN RAISE EXCEPTION 'not_your_turn' USING errcode='22023'; END IF;
  -- Flirt/Erotiek need a separate mutual opt-in contract; do not expose those
  -- prompts by default on a device the partner has not explicitly opted into.
  IF p_category IS NULL OR p_category='Erotiek'
   THEN RAISE EXCEPTION 'category_needs_consent' USING errcode='22023'; END IF;
  SELECT count(*) INTO v_count FROM public.us_question_catalog WHERE category=p_category;
  IF v_count<1 THEN RAISE EXCEPTION 'unknown_category' USING errcode='22023'; END IF;
  SELECT prompt,hard INTO v_prompt,v_hard FROM public.us_question_catalog
    WHERE category=p_category ORDER BY item_no OFFSET (v_game.question_number%v_count) LIMIT 1;
  IF v_prompt IS NULL THEN RAISE EXCEPTION 'question_not_found' USING errcode='22023'; END IF;
  UPDATE public.us_quest_games SET phase='question',question_category=p_category,
   question_prompt=v_prompt,question_hard=v_hard,question_asked_by=v_uid,question_answer=NULL
   WHERE couple_id=v_pair;
 ELSIF p_action='submit' THEN
  IF v_game.phase<>'question' OR v_game.question_asked_by<>v_uid
   THEN RAISE EXCEPTION 'not_question_asker' USING errcode='22023'; END IF;
  IF p_answer IS NULL OR char_length(btrim(p_answer))<1 OR char_length(p_answer)>1500
   THEN RAISE EXCEPTION 'invalid_answer' USING errcode='22023'; END IF;
  UPDATE public.us_quest_games SET phase='question_review',question_answer=btrim(p_answer)
   WHERE couple_id=v_pair;
 ELSIF p_action IN ('approve','reject') THEN
  IF v_game.phase<>'question_review' OR v_game.question_asked_by=v_uid
   THEN RAISE EXCEPTION 'not_question_reviewer' USING errcode='22023'; END IF;
  IF p_action='reject' THEN
   UPDATE public.us_quest_games SET phase='question',question_answer=NULL WHERE couple_id=v_pair;
  ELSE
   v_steps:=CASE WHEN v_game.question_hard THEN 5 ELSE 3 END;
   v_old_position:=v_game.position;
   UPDATE public.us_quest_games SET position=position+v_steps,
    turn_user=v_uid,phase='choose',question_category=NULL,question_prompt=NULL,
    question_hard=false,question_answer=NULL,question_asked_by=NULL,
    question_number=question_number+1 WHERE couple_id=v_pair;
   INSERT INTO public.us_quest_question_results
    (couple_id,asked_by,approved_by,category,steps,position_before,position_after)
    VALUES(v_pair,v_game.question_asked_by,v_uid,v_game.question_category,v_steps,v_old_position,v_old_position+v_steps);
   FOR v_cell IN (floor(v_old_position/20.0)::integer+1)..(floor((v_old_position+v_steps)/20.0)::integer) LOOP
    IF v_cell>0 THEN
     INSERT INTO public.us_quest_milestones(couple_id,cell) VALUES(v_pair,v_cell*20) ON CONFLICT DO NOTHING;
     PERFORM us_two_private.seed_superdate(v_pair,v_cell*20);
    END IF;
   END LOOP;
  END IF;
 ELSIF p_action IN ('skip','cancel') THEN
  IF v_game.phase<>'question' OR v_game.question_asked_by<>v_uid
   THEN RAISE EXCEPTION 'not_question_asker' USING errcode='22023'; END IF;
  UPDATE public.us_quest_games SET phase='choose',
   turn_user=CASE WHEN p_action='skip' THEN v_partner ELSE v_uid END,
   question_category=NULL,question_prompt=NULL,question_hard=false,
   question_answer=NULL,question_asked_by=NULL,
   question_number=question_number+(CASE WHEN p_action='skip' THEN 1 ELSE 0 END)
   WHERE couple_id=v_pair;
 ELSE
  RAISE EXCEPTION 'unknown_action' USING errcode='22023';
 END IF;
 UPDATE public.us_quest_games SET revision=revision+1,updated_at=now() WHERE couple_id=v_pair;
 v_result:=public.us_quest_question_state();
 INSERT INTO public.us_quest_events(actor_id,request_id,couple_id,operation,result)
 VALUES(v_uid,p_request_id,v_pair,'question_'||p_action,v_result);
 RETURN v_result;
END $$;
REVOKE ALL ON FUNCTION public.us_quest_question_state() FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.us_quest_question_action(text,integer,uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.us_quest_question_state() TO authenticated;
GRANT EXECUTE ON FUNCTION public.us_quest_question_action(text,integer,uuid,text,text) TO authenticated;
