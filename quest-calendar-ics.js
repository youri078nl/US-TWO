/* Private, client-only .ics export. No network request or hidden superdate details. */
(function(root){
  'use strict';
  function escapeText(value){
    return String(value??'').replace(/\r\n?/g,'\n').replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g,'')
      .replace(/\\/g,'\\\\').replace(/\n/g,'\\n')
      .replace(/,/g,'\\,').replace(/;/g,'\\;');
  }
  function fold(line){
    const encoder=new TextEncoder();
    let result='',bytes=0;
    for(const ch of line){
      const size=encoder.encode(ch).length;
      if(bytes+size>75){result+='\r\n ';bytes=1;}
      result+=ch;bytes+=size;
    }
    return result;
  }
  function stamp(date){
    return date.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');
  }
  function stableId(value){
    // Opaque, deterministic UID. No email address, account ID or private notes.
    let h=2166136261;
    for(const ch of String(value)){h^=ch.codePointAt(0);h=Math.imul(h,16777619);}
    return (h>>>0).toString(16).padStart(8,'0');
  }
  function calendar(events,{now=new Date()}={}){
    if(!Array.isArray(events))throw Error('Afspraaklijst ontbreekt.');
    const unique=new Set(),lines=[
      'BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//US TWO//Private couple calendar//NL',
      'CALSCALE:GREGORIAN','METHOD:PUBLISH','X-WR-CALNAME:US TWO afspraken'
    ];
    for(const item of events){
      if(!item||item.status!=='accepted'||typeof item.start_at!=='string')continue;
      const begin=new Date(item.start_at);
      if(!Number.isFinite(begin.getTime()))continue;
      const duration=Number.isInteger(item.duration_minutes)&&item.duration_minutes>=15&&item.duration_minutes<=1440
        ?item.duration_minutes:60;
      const end=new Date(begin.getTime()+duration*60000);
      const title=String(item.title||'US TWO-date').trim().slice(0,120);
      const key=String(item.id||title)+'|'+begin.toISOString();
      if(unique.has(key))continue;unique.add(key);
      const uid='us-two-'+stableId(key)+'-'+stableId(title)+'@local.invalid';
      lines.push('BEGIN:VEVENT','UID:'+uid,'DTSTAMP:'+stamp(now),'DTSTART:'+stamp(begin),
        'DTEND:'+stamp(end),'SUMMARY:'+escapeText(title),'DESCRIPTION:Bevestigde US TWO-afspraak.',
        'CLASS:PRIVATE','STATUS:CONFIRMED','END:VEVENT');
    }
    lines.push('END:VCALENDAR');
    return lines.map(fold).join('\r\n')+'\r\n';
  }
  const api=Object.freeze({calendar,escapeText});
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.USTwoCalendarIcs=api;
})(typeof window!=='undefined'?window:undefined);
