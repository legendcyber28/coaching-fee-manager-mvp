import type {MetadataRoute} from 'next';
export default function manifest():MetadataRoute.Manifest{return {name:'Fee Manager',short_name:'Fee Manager',description:'Coaching Institute Fee Manager',start_url:'/',display:'standalone',background_color:'#ffffff',theme_color:'#176a58',icons:[{src:'/icon',sizes:'512x512',type:'image/png'}]}}
