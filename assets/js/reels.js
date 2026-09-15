feed?.addEventListener('click', async (e) => {
  const empty=e.target.closest('#emptyPostButton');
  if(empty){postForm?.scrollIntoView({behavior:'smooth'});return;}
  if(e.target.closest('#retryFeed')){loadFeed();return;}
  const author=e.target.closest('[data-author-profile]');
  if(author){location.href=`/perfil?u=${encodeURIComponent(author.dataset.authorProfile)}`;return;}
  const b=e.target.closest('[data-action]');
  const card=e.target.closest('[data-id]');
  if(!b||!card)return;
  const id=card.dataset.id,kind=b.dataset.action;
  if(kind==='fullscreen'){openFullscreen(card.querySelector('video'));return;}
  if(kind==='comments'){card.querySelector('.comment-form input')?.focus();return;}
  if(kind==='share'){localStorage.setItem('riseup_share_post',JSON.stringify(posts.find(p=>p.id===id)));location.href='/chat';return;}
  const state=actionState[id]||{};state[kind]=!state[kind];actionState[id]=state;localStorage.setItem('riseup_actions',JSON.stringify(actionState));render();
  fetch('/api/social',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'interaction',me:currentEmail,postId:id,kind,active:state[kind]})}).catch(()=>{});
});