import { validateTelegram } from "./telegram_auth.js";

const MAX_RESULT_ARRAY=100;

export default {
  async fetch(request,env){
    const url=new URL(request.url);
    if(request.method!=="POST"||url.pathname!=="/api/game-sessions")return json({ok:false,error:"Not found"},404);
    try{
      const body=await request.json();
      const auth=await validateTelegram(body?.initData,env.TELEGRAM_BOT_TOKEN);
      if(!auth.ok)return json({ok:false,error:auth.error},401);
      const gameCode=typeof body?.game_code==="string"?body.game_code:"";
      const score=Number(body?.score),difficulty=Number(body?.difficulty??1);
      const reactionMs=body?.reaction_ms==null?null:Number(body.reaction_ms),falseStarts=Number(body?.false_starts??0);
      const accuracy=body?.accuracy_percent==null?null:Number(body.accuracy_percent),durationMs=body?.duration_ms==null?null:Number(body.duration_ms);
      const errorCount=Number(body?.error_count??0),gridSize=body?.grid_size==null?null:Number(body.grid_size),patternLength=body?.pattern_length==null?null:Number(body.pattern_length);
      const inputTiming=body?.input_timing_ms==null?null:body.input_timing_ms,metadata=body?.metadata==null?{}:body.metadata;
      if(!/^[a-z0-9_]{2,64}$/.test(gameCode)||!Number.isInteger(score)||score<0||score>1000000||!Number.isInteger(difficulty)||difficulty<1||difficulty>20)return json({ok:false,error:"Invalid game result"},400);
      if(reactionMs!==null&&(!Number.isInteger(reactionMs)||reactionMs<1||reactionMs>60000)||!Number.isInteger(falseStarts)||falseStarts<0||falseStarts>100)return json({ok:false,error:"Invalid reaction data"},400);
      if(accuracy!==null&&(!Number.isFinite(accuracy)||accuracy<0||accuracy>100)||durationMs!==null&&(!Number.isInteger(durationMs)||durationMs<1||durationMs>120000)||!Number.isInteger(errorCount)||errorCount<0||errorCount>1000)return json({ok:false,error:"Invalid game metrics"},400);
      if(gridSize!==null&&(!Number.isInteger(gridSize)||gridSize<2||gridSize>10)||patternLength!==null&&(!Number.isInteger(patternLength)||patternLength<1||patternLength>100)||inputTiming!==null&&(!Array.isArray(inputTiming)||inputTiming.length>MAX_RESULT_ARRAY)||metadata===null||typeof metadata!=="object"||Array.isArray(metadata))return json({ok:false,error:"Invalid game metrics"},400);
      const key=env.SUPABASE_SECRET_KEY;
      if(!env.SUPABASE_URL||!key)return json({ok:false,error:"Server storage configuration error"},500);
      const rpc=await fetch(env.SUPABASE_URL.replace(/\/$/,"")+"/rest/v1/rpc/record_game_session",{method:"POST",headers:{apikey:key,Authorization:"Bearer "+key,"content-type":"application/json"},body:JSON.stringify({p_telegram_id:auth.user.id,p_first_name:auth.user.first_name,p_username:auth.user.username,p_game_code:gameCode,p_score:score,p_difficulty:difficulty,p_reaction_ms:reactionMs,p_false_starts:falseStarts,p_accuracy_percent:accuracy,p_duration_ms:durationMs,p_error_count:errorCount,p_grid_size:gridSize,p_pattern_length:patternLength,p_input_timing_ms:inputTiming,p_metadata:metadata})});
      const text=await rpc.text();
      if(!rpc.ok)return json({ok:false,error:"Could not save game result"},502);
      let result={};try{result=JSON.parse(text)}catch{}
      return json({ok:true,...result});
    }catch{return json({ok:false,error:"Could not save game result"},500)}
  }
};

function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=UTF-8","cache-control":"no-store"}})}
