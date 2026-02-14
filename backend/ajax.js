jQuery(document).ready(function($){
 let page=0;
 $('#load-more').on('click',function(){
  page++;
  $.post(profileAjax.ajaxurl,{action:'load_profiles',page:page},function(res){
   if(!res.length){$('#load-more').hide();return;}
   res.forEach(p=>{
    $('#profile-results').append(`
     <div class="profile-card">
      <img src="${p.image}">
      <h3>${p.name}</h3>
      <p>${p.designation}</p>
      <a href="/profile/${p.slug}">View</a>
     </div>`);
   });
  });
 });
});