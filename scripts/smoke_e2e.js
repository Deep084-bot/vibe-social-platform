(async function(){
  try{
    const base='http://localhost:3000';
    const fetch = global.fetch;
    if(!fetch) throw new Error('global fetch not available');

    console.log('\n== REGISTER ==');
    const reg = await fetch(base+'/api/auth/register',{
      method:'POST',
      headers:{'content-type':'application/json'},
      body: JSON.stringify({username:'smokeuser',email:'smoke+test@example.com',password:'password123',displayName:'Smoke User'})
    });
    console.log('status', reg.status);
    const regText = await reg.text();
    console.log(regText);

    console.log('\n== LOGIN ==');
    const login = await fetch(base+'/api/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({identifier:'smokeuser',password:'password123'})});
    console.log('status', login.status);
    const loginJson = await login.json().catch(()=>null);
    console.log(JSON.stringify(loginJson, null, 2));
    const token = loginJson?.token || '';

    console.log('\nTOKEN:', token);

    console.log('\n== CREATE POST ==');
    const createPost = await fetch(base+'/api/posts',{method:'POST',headers:{'content-type':'application/json','authorization':'Bearer '+token},body:JSON.stringify({content:{text:'Hello from node smoke'},type:'post'})});
    console.log('status', createPost.status);
    console.log(await createPost.text());

    console.log('\n== LIST POSTS ==');
    const posts = await fetch(base+'/api/posts');
    console.log('status', posts.status);
    console.log(await posts.text());

    console.log('\n== CREATE CHAT MESSAGE ==');
    const chatPost = await fetch(base+'/api/chat/test-chat/messages',{method:'POST',headers:{'content-type':'application/json','authorization':'Bearer '+token},body:JSON.stringify({content:'Hello chat from node smoke'})});
    console.log('status', chatPost.status);
    console.log(await chatPost.text());

    console.log('\n== GET CHAT MESSAGES ==');
    const chatGet = await fetch(base+'/api/chat/test-chat/messages');
    console.log('status', chatGet.status);
    console.log(await chatGet.text());

  }catch(err){
    console.error('Smoke test failed:', err);
  }
})();
