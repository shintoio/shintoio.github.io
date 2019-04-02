$("#stack_desk").val('');
var $form = $('#contact-form'),
    url = 'https://script.google.com/macros/s/AKfycbwxKhozyF-JU23C1kIhhbMv-VRff1wR9DeAw3dDWSISAQSKC7cU/exec'

$('#submit-form').on('click', function(e) {
  e.preventDefault();
  var jqxhr = $.ajax({
    url: url,
    method: "GET",
    dataType: "json",
    data: $form.serializeObject()
  }).done(function() {
    cleanFields();
  });
})

function cleanFields(){
  $("#company_name").val('');
  $("#contact_name").val('');
  $("#contact_email").val('');
  $("#stack_desk").val('');

}