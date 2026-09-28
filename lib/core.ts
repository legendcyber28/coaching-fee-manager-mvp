export function toPaise(value: unknown): number {
  const n=Number(value); if(!Number.isFinite(n)||n<0||Math.abs(Math.round(n*100)-n*100)>1e-6) throw Error('Enter a valid amount with up to 2 decimal places'); return Math.round(n*100);
}
export function feeStatus(total:number,paid:number,dueDate:Date,now=new Date()) {
  if(paid>=total)return 'Paid';
  if(new Date(dueDate).getTime()<new Date(now.toLocaleDateString('en-CA',{timeZone:'Asia/Kolkata'})+'T00:00:00.000Z').getTime())return 'Overdue';
  if(paid>0)return 'Partial'; return 'Pending';
}
export function monthValid(month:string){return /^\d{4}-(0[1-9]|1[0-2])$/.test(month)}
export function dateOnly(value:string){ if(!/^\d{4}-\d{2}-\d{2}$/.test(value))throw Error('Invalid date');const d=new Date(`${value}T00:00:00.000Z`);if(isNaN(d.getTime())||d.toISOString().slice(0,10)!==value)throw Error('Invalid date');return d;}
export function rupees(paise:number){return (paise/100).toLocaleString('en-IN',{style:'currency',currency:'INR'})}
