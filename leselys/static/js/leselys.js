function addFeed() {
  var url = document.getElementById('urlFeed').value;
  if (url == '') { return false }

  // Clear help message if no subscriptions
  if (document.getElementById('menu').getElementsByClassName('empty-feed-list')) {
    document.getElementById('menu').getElementsByClassName('empty-feed-list')[0].style.display = "none";
    document.getElementById('menu').getElementsByClassName('feeds-list-title')[0].style.display = "";
  }

  var loader = crel("li", crel("i", {"class": "icon-tasks"}), " Loading...");
  loader.style.display = "none";
  loader = document.getElementById('menu').appendChild(loader);
  $(loader).fadeIn();
  $.post("/api/add", {url: url}, function(data) {
    if (data.success == true) {
      var feedId = data.feed_id;
      var feedTitle = data.title;
      var feedURL = data.url;
      var feedCounter = data.counter;

      var newFeed = crel('a', {'onClick': 'viewFeed("' + feedId + '")', 'href': '/#' + feedId}, feedTitle + " ",
            crel('span', {'class': 'badge badge-inverse unread-counter'}, feedCounter));

      $(loader).fadeOut(function () {
        loader.innerHTML = newFeed.outerHTML;
        loader.id = feedId;
        loader.className += " story";
        $(loader).fadeIn();
      });

      // Add new feed in settings/feeds if opened
      if (document.getElementById('feeds-settings')) {
        // Remove message if feeds list is empty
        if (document.getElementById('feeds-settings').getElementsByClassName('empty-feed-list')) {
          document.getElementById('feeds-settings').getElementsByClassName('empty-feed-list')[0].style.display = "none";
        }
        var newFeedSetting = crel('li', {'id': feedId}, feedTitle, 
              ' (',
              crel('a', {'class': 'muted', 'href': '#', 'onClick': 'deleteFeed("' + feedId + '")'}, 'remove'),
              ') - ',
              crel('a', {'href': feedURL, 'target': '_blank'}, feedURL));
        newFeedSetting.style.display = "none";
        newFeedSetting = document.getElementById('feeds-settings').getElementsByTagName('ul')[0].appendChild(newFeedSetting);
        $(newFeedSetting).fadeIn();
      }
    } else {
      loader.innerHTML = '<li><i class="icon-exclamation-sign"></i> Error: ' + data.output +'</li>';
      var clearLoader = function() {
        $(loader).hide();
      }
      setTimeout(clearLoader, 5000);
    }
  });
  $('#add').popover('hide')
}

function handleOPMLImport(evt) {
  if (document.getElementById("upload-file-info").innerHTML == "") { return false }
  if (importer) { return false }

  // Check if browser is FileRead object compatible
  if (window.File && window.FileReader && window.FileList && window.Blob) {
    // Great success! All the File APIs are supported.
  } else {
    alert('The File APIs are not fully supported in this browser.');
    return false;
  }

  // Retrieve file from form
  importer = true;
  var file = document.getElementById('OPMLFile').files[0];
  if (!file) { return false }
  var reader = new FileReader();

  reader.onload = (function(OPMLFile) {
    return function(e) {
      $.post('/api/import/opml', { file: e.target.result }, function(data) {
        if (data.success == true) {
          importer = false;
          document.getElementById("OPMLSubmit").innerHTML = "Importing, reload page later...";
          $('#OPMLSubmit').addClass('disabled');
        }
      });
    }
  })(file);
  reader.readAsText(file);
}

function viewSettings() {
  $.get('/settings', function(data) {
    var content = $(data).find('#content');
    var sidebar = $(data).find('#menu')
    document.getElementById("content").innerHTML = content.html();
    document.getElementById("menu").innerHTML = sidebar.html()
    if (importer) {
      document.getElementById("OPMLSubmit").innerHTML = "Last import not finished...";
      document.getElementById("OPMLSubmit").className += " disabled";
      return false;
    }
    if (document.getElementById("OPMLSubmit")) {
      document.getElementById('OPMLSubmit').addEventListener('click', handleOPMLImport, false);
    }
    initAddFeed();
  });
}

function viewHome() {
  $.get('/', function(data) {
    var content = $(data).find('#content');
    var sidebar = $(data).find('#menu')
    document.getElementById("content").innerHTML = content.html();
    document.getElementById("menu").innerHTML = sidebar.html()
    initAddFeed();
  });
}

function deleteFeed(feedId) {
  $.ajax({
    url: '/api/remove/' + feedId,
    type: 'DELETE',
    success: function(result) {
      $('#feeds-settings ul li#' + feedId).fadeOut(300, function() {
        $(this).remove();
        if ($('#feeds-settings ul li').length < 1) {
          fadeIn(document.getElementById('feeds-settings').getElementsByClassName('empty-feed-list')[0])
        }
      });
      $('ul#menu li#' + feedId).fadeOut(300, function() {
        $(this).remove();
        if ($('ul#menu li').length < 6) {
          fadeOut(document.getElementById('menu').getElementsByClassName('feeds-list-title')[0])
          fadeIn(document.getElementById('menu').getElementsByClassName('empty-feed-list')[0])
        }
      });
    }
  });
}

function viewFeed(feedId) {
  $.each(requests, function(i, request) {
      request.abort();
      requests.shift();
  });
  var request = $.getJSON('/api/get/' + feedId, function(data) {
    var storyListAccordion = crel('div', {'class': 'accordion', 'id': 'story-list-accordion'});
    var content = '';

    $.each(data.content, function(i,item){
      var storyId = item._id;
      var storyTitle = item.title;
      var storyAccordion = getStoryAccordionTemplate();

      storyAccordion.id = storyId;
      storyAccordion.getElementsByClassName("accordion-toggle")[0].onclick = 'readStory("' + storyId + '")';
      storyAccordion.getElementsByClassName("accordion-toggle")[0].setAttribute("onclick", 'readStory("' + storyId + '")');
      storyAccordion.getElementsByClassName("accordion-toggle")[0].innerHTML = storyTitle;
      storyAccordion.getElementsByClassName("accordion-toggle")[0].setAttribute("data-target", "#" + storyId + " .accordion-body");

      if (item.read == false) {
        storyAccordion.getElementsByClassName('accordion-toggle')[0].style.fontWeight = "bold";
      }

      content += storyAccordion.outerHTML;
    });
    storyListAccordion.innerHTML = content;
    document.getElementById('content').innerHTML = storyListAccordion.outerHTML;

    $('#menu a').each(function(index) {
      $(this).css('font-weight', 'normal');
    });
    document.getElementById(feedId).getElementsByTagName('a')[0].style.fontWeight = "bold";
  });
  requests.push(request);
}

function refreshFeeds() {
  $.each($('#menu .feed'), function(i, feed) {
    var feedId = $(feed).attr('id');
    $.getJSON('/api/refresh/' + feedId), function(data) {
      var feedTitle = data.content.title;
      var feedCounter = data.content.counter;
      document.getElementById(feedId).getElementsByClassName('badge')[0].innerHTML = feedCounter;
    }
  });
}

function readStory(storyId, ignore) {
  // // Avoid "read" state if story have just been marked unread
  var ignore = ignore || false;
  if (ignore == true) {
    document.getElementById(storyId).getElementsByClassName("accordion-toggle")[0].onclick = 'readStory("' + storyId + '")';
    document.getElementById(storyId).getElementsByClassName("accordion-toggle")[0].setAttribute("onclick", 'readStory("' + storyId + '")');
    return true
  }

  $.getJSON('/api/read/' + storyId, function(data) {
    if (data.content.last_update == false) {
      var published = "No date";
    } else {
      var published = data.content.last_update['year'] + '-' + data.content.last_update['month'] +
                    '-' + data.content.last_update['day'];
    }

    var feedId = data.content.feed_id;
    var story = getStoryTemplate();

    story.getElementsByClassName("story-link")[0].href = data.content.link;
    story.getElementsByClassName("story-read-toggle")[0].onclick = 'unreadStory("' + storyId + '")';
    story.getElementsByClassName("story-read-toggle")[0].setAttribute("onclick", 'unreadStory("' + storyId + '")');
    story.getElementsByClassName("story-read-toggle")[0].innerHTML = 'Mark as unread';
    story.getElementsByClassName("story-content")[0].innerHTML = data.content.description;
    story.getElementsByClassName("story-date")[0].innerHTML = published;

    document.getElementById(storyId).getElementsByClassName("accordion-body")[0].innerHTML = story.outerHTML;
    if (data.success == true) {
      var counter = parseInt($("#" + feedId + " .unread-counter").html()) - 1;
      document.getElementById(feedId).getElementsByClassName('unread-counter')[0].innerHTML = counter;
      if (counter == 0) {
        $("#" + feedId + " .unread-counter").fadeOut();
      }
    }
  });
  document.getElementById(storyId).getElementsByClassName("accordion-toggle")[0].style.fontWeight = 'normal';
}

function unreadStory(storyId) {
  $.getJSON('/api/unread/' + storyId, function(data) {
    if (data.success == true) {
      var feedId = data.content.feed_id;
      var story = document.getElementById(storyId);

      // Avoid next click on story title
      document.getElementById(storyId).getElementsByClassName("accordion-toggle")[0].onclick = 'readStory("' + storyId + '", true)';
      document.getElementById(storyId).getElementsByClassName("accordion-toggle")[0].setAttribute("onclick", 'readStory("' + storyId + '", true)');

      story.getElementsByClassName("story-read-toggle")[0].onclick = 'readStory("' + storyId + '")';
      story.getElementsByClassName("story-read-toggle")[0].setAttribute("onclick", 'readStory("' + storyId + '")');
      story.getElementsByClassName("story-read-toggle")[0].innerHTML = 'Mark as read';

      var counter = parseInt($("#" + feedId + " .unread-counter").html()) + 1;

      $('a[href=#' + storyId + ']').data('unreaded', true);
      if (counter == 1) {
        $("#" + feedId + " .unread-counter").html(counter);
        $("#" + feedId + " .unread-counter").fadeIn();
      } else {
        $("#" + feedId + " .unread-counter").html(counter);
      }
      document.getElementById(storyId).getElementsByClassName("accordion-toggle")[0].style.fontWeight = 'bold';
    }
  });
}

function initAddFeed() {
  var addFeed = getAddFeedTemplate();
  $('#add').popover({'title': "<center>New feed</center>",
                     'html': true,
                     'content': addFeed.outerHTML,
                     'placement': "bottom"}
  );
}
$(document).ready(function() {
  // Globals
  // Remove anchors binding for mobile view
  $('.feed').click(function(e) {
    e.preventDefault();
  });
  $('.accordion-group').click(function(e) {
    e.preventDefault();
  });
  $('.accordion-body').click(function(e) {
    e.preventDefault();
  });
  requests = new Array();
  importer = false;
});