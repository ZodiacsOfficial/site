/**
 * The embeds are static HTML, so the `?theme=` and `?accent=` parameters the
 * widget generator emits cannot be read at build time. This inline script
 * applies them in the host's iframe before first paint: it flips the
 * `data-theme` attribute the palette keys on, and lowers or raises a host
 * accent only as far as WCAG AA (4.5:1) requires — the same rule as
 * `widgetAccentForTheme` in ./widgets.ts. It reads nothing but the query
 * string, sends nothing, and stores nothing.
 */
export const WIDGET_THEME_SCRIPT = [
  '(function(){',
  'var d=document.documentElement,q;',
  'try{q=new URLSearchParams(location.search)}catch(e){return}',
  "var t=q.get('theme');if(t==='light'||t==='dark'){d.setAttribute('data-theme',t)}",
  "var a=q.get('accent')||'';if(!/^#[0-9a-f]{6}$/i.test(a))return;",
  "var light=d.getAttribute('data-theme')==='light';",
  'var bg=light?[251,250,247]:[10,12,17];',
  'function ch(h){return[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)]}',
  'function lum(c){var r=c.map(function(v){v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)});return 0.2126*r[0]+0.7152*r[1]+0.0722*r[2]}',
  'var bl=lum(bg);',
  'function ratio(c){var l=lum(c),hi=Math.max(l,bl),lo=Math.min(l,bl);return(hi+0.05)/(lo+0.05)}',
  'var src=ch(a),out=src;',
  'if(ratio(src)<4.5){var target=light?0:255;out=null;',
  'for(var s=1;s<=100;s++){var m=s/100,c=src.map(function(v){return Math.round(v+(target-v)*m)});if(ratio(c)>=4.5){out=c;break}}',
  'if(!out){out=light?[0,0,0]:[255,255,255]}}',
  "var v='rgb('+out.join(',')+')';d.style.setProperty('--w-accent',v);d.style.setProperty('--widget-accent',v);d.style.setProperty('--w-accent-bar',v);",
  '})();',
].join('');
