var socket = new io.Socket("m.tutamc.com", {port: 8389});

socket.connect();
socket.on('message', function(message){
    if (is_empty) $(".nomail").fadeOut().remove();
    $('li.template').clone().directives({
        'span.from':'from',
        'span.subject':'subject',
        'span.body':function(arg){
            if (arg.context.body.length > 300) {
                return arg.context.body.slice(0, 300);
            }
            return arg.context.body;
        },
        'a.more':function(arg){
            if (arg.context.body.length > 300) {
                return "[ more ]";
            }
            return "";
        },
        'span.body.after':function(arg){
            return arg.context.body.slice(300);
        }})
        .render(message).removeClass("template").appendTo('#mailbox').fadeIn();
});

$(document).ready(function(){
    if (typeof(email) != 'undefined') {
        socket.send({command:"start_listen", email:email});
    }
    $("a.more").live("click",function(){
        $(this).hide().prev("span.body.after").fadeIn().parent().children("a.less").show();
    });
    $("a.less").live("click",function(){
        $(this).hide().prev().prev("span.body.after").fadeOut().parent().children("a.more").show();
    });
    $("#t_mail").change(function(){
        $("#r_mail").val( $("#t_mail").val()+"@m.tutamc.com" );
    });
});
