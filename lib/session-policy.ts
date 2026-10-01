// A fresh sign-in is required after 30 days, even with continued use.
export const sessionIdleSeconds=30*24*60*60;
export const sessionAbsoluteSeconds=30*24*60*60;
export function newSessionTimes(now:number){return {until:now+sessionIdleSeconds*1000,absoluteUntil:now+sessionAbsoluteSeconds*1000}}
export function renewSessionTimes(s:{until:number;absoluteUntil?:number},now:number){const absoluteUntil=s.absoluteUntil??s.until;return {absoluteUntil,until:Math.min(now+sessionIdleSeconds*1000,absoluteUntil)}}
