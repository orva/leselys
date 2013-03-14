function addSubscription() {
    var url = $('#urlSubscription').val();
    if (url == '') {
        return false;
    }

    // Clear help message if no subscriptions
    if ($("ul#menu li#helper").length) {
      $("ul#menu li#helper").remove();
      $("ul#menu li#listSubscriptions").show();
    }
    var loader = $('<li><i class="icon-tasks"></i> Loading...</li>');
    $("ul#menu").append(loader);
    $.post('/api/add', {url: url}, function(data) {
        if (data.success == true) {
          $(loader).hide();
          $(loader).html('<a onClick="viewSubscription(&quot;' + data.feed_id + '&quot;)" href="#' + data.feed_id + '">' + data.title + ' <span id="unread-counter" class="badge badge-inverse">' + data.counter  + '</span></a>').fadeIn();
        } else {
            $(loader).html('<li><i class="icon-exclamation-sign"></i> Error: ' + data.output +'</li>');
            var clearLoader = function() {
              $(loader).fadeOut();
            }
            setTimeout(clearLoader, 5000);
        }
    });
    $('#add').popover('hide')
}

function viewSubscription(feedId) {
    $.getJSON('/api/get/' + feedId, function(data) {
        $('#content').html('<div class="accordion" id="accordion2">');
        $.each(data.content, function(i,item){
            var content = '<div class="accordion-group">                                                                                            \
    <div class="accordion-heading">                                                                                                                 \
        <a class="accordion-toggle" data-toggle="collapse" onClick="readEntry(&quot;' + item._id + '&quot)" data-parent="#accordion2" href="#' + item._id + '">' + item.title + '</a>  \
    </div>                                                                                                                                          \
    <div id="' + item._id + '" class="accordion-body collapse">                                                                                     \
        <div class="accordion-inner" id="' + item._id + '"></div>                                                                                   \
    </div>                                                                                                                                          \
</div>';
            $("#content").append(content);
            if (item.read == false) {
                $('#content a[href=#' + item._id + ']').css('font-weight', 'bold');
            }
        });
        $('#content').append('</div>');
        $('#menu a').each(function(index) {
            $(this).css('font-weight', 'normal');
        });
        $('#menu a[href=#' + feedId + ']').css('font-weight', 'bold');
    });

}

function refreshSubscriptions() {
  $.getJSON('/api/refresh', function(data) {
    $.each(data.content, function(i,feed) {
      var feed_title = feed[0];
      var feed_id = feed[1];
      var feed_counter = feed[2];
      $("#menu a[href=#" + feed_id + "] span.badge").html(feed_counter);
    });
  });
}

function readEntry(entryId) {
    if ($('a[href=#' + entryId + ']').data('loaded') == true) {
        return true;
    }
    $.getJSON('/api/read/' + entryId, function(data) {
        var published = data.content.last_update['year'] + '-' + data.content.last_update['month'] +
                        '-' + data.content.last_update['day'];
        var header =  '<p><span class="label">' + published + '</span> | <a href="' + data.content.link + '" target="_blank">External link</a></p>';
        var content = '<div class="accordion-inner"' + header + data.content.description + "</div>";
        $('#content #' + entryId).html(content);
        if (data.content.last_read_state == false) {
          var feed_id = data.content.feed_id;
          var counter = $("#menu a[href=#" + feed_id + "] span.badge").html() - 1;
          if (counter == 0) {
            $("#menu a[href=#" + feed_id + "] span.badge").remove();
          } else {
            $("#menu a[href=#" + feed_id + "] span.badge").html(counter);
          }
        }
    });

    $('a[href=#' + entryId + ']').css('font-weight', 'normal').data('loaded', true);
}

$(document).ready(function(){
    var add_content = '<form><fieldset><center>                                      \
    <input id="urlSubscription" type="text" class="input-medium" placeholder="Url…"> \
    <button type="submit" class="btn" onClick="addSubscription()">Submit</button>    \
    </center></fieldset></form>';
    $('#add').popover({title:"<center>New subscription</center>",html:true,content:add_content,placement:"bottom"});
});