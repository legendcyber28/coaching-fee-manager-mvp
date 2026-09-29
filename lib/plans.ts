// India-only preview. No checkout, payment collection or plan assignment is enabled here.
export const indiaPlans=[
 {code:'starter',name:'Starter',studentLimit:50,setupFeePaise:0,monthlyFeePaise:29900,optionalHelpPaise:null,features:['Fees','Attendance','Receipts']},
 {code:'standard',name:'Standard',studentLimit:200,setupFeePaise:0,monthlyFeePaise:69900,optionalHelpPaise:99900,features:['Fees','Attendance','Receipts']},
 {code:'pro',name:'Pro',studentLimit:500,setupFeePaise:0,monthlyFeePaise:119900,optionalHelpPaise:299900,features:['Fees','Attendance','Receipts']}
] as const;
