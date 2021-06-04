// 2. This code loads the IFrame Player API code asynchronously.
var tag = document.createElement('script');

tag.src = "https://www.youtube.com/iframe_api";
var firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

// 3. This function creates an <iframe> (and YouTube player)
//    after the API code downloads.
var player;
var videoChanged = false;
let duration = null;
let node_index = 0;
let rows_dictionary = {};

function getVideoIdFromURL(url) {
    const urlParams = new URLSearchParams((new URL(url)).search);
    return urlParams.get('v');
}

function onYouTubeIframeAPIReady() {
    player = new YT.Player('player', {
        height: '360',
        width: '640',
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange
        }
    });
}

// 4. The API will call this function when the video player is ready.
function onPlayerReady(event) {
}

var interval_id = null;

function registerScrollEvent() {
    node_index++;
    
    if (!(node_index in rows_dictionary)) {
        console.log('end of lyrics')
        return;
    }
    
    let start = rows_dictionary[node_index].start;
    let current_time = Math.round(player.getCurrentTime() * 1000);
    let time_to_wait = (moment(start, 'HH:mm:ss.SSS').valueOf() - moment("00:00:00:000", 'HH:mm:ss.SSS').valueOf() - current_time);

    setTimeout(function () {
        console.log('node_index: ' + node_index)
        $('#' + node_index).get(0).scrollIntoView();
        registerScrollEvent();
    }, time_to_wait);
}

// 5. The API calls this function when the player's state changes.
//    The function indicates that when playing a video (state=1),
//    the player should play for six seconds and then stop.
function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.PLAYING) {
        if (!$.isEmptyObject(rows_dictionary)) {
            registerScrollEvent()
        }
        
        var $duration = $('#duration');
        
        if (videoChanged) {
            duration = player.getDuration();
            $duration.val(duration);
            $('#start').val(0);
            $('#end').val(duration);
            videoChanged = false;
        }
        
        if (!interval_id) {
            interval_id = setInterval(seekToStart, $duration.val() * 1000);
        }
    } else if (event.data === YT.PlayerState.PAUSED) {
        clearInterval(interval_id);
        interval_id = null;
        seekToStart();
    }
}

function seekToStart() {
    node_index = 0;
    player.seekTo(document.getElementById('start').value);
}

function applyChanges(start, duration) {
    clearInterval(interval_id);
    player.seekTo(start);
    interval_id = setInterval(seekToStart, duration * 1000);
}

function reset() {
    player.stopVideo();
    $('#duration').val('');
    $('#start').val('');
    $('#player').hide();
}

function processFile(file_contents) {
    let rows = file_contents.split(/\r?\n/);
    let element_row_index = 0;
    let row_object = {};

    rows.forEach(function (row, index) {
        element_row_index++

        switch (element_row_index) {
            case 1:
                row_object.index = row;
                break;
            case 2:
                [row_object.start, row_object.end] = row.split(' --> ');
                break;
            case 3:
                row_object.chords = row;
                break;
            case 4:
                row_object.lyrics = row;
                break;
            default:
                rows_dictionary[row_object.index] = row_object;
                row_object = {};
                element_row_index = 0;
        }
    });

    for (const [index, row_object] of Object.entries(rows_dictionary)) {
        let row_node = document.createElement('div');
        row_node.setAttribute('id', row_object.index);
        chords.appendChild(row_node);

        let chord_node = document.createElement('p');
        chord_node.className = "chords";
        chord_node.appendChild(document.createTextNode(row_object.chords));
        row_node.appendChild(chord_node);
        
        let lyrics_node = document.createElement('p');
        lyrics_node.className = "lyrics";
        lyrics_node.appendChild(document.createTextNode(row_object.lyrics));
        row_node.appendChild(lyrics_node);
    }

    seekToStart();
}

$('#video-url').change( function () {
    var $this = $(this);
    clearInterval(interval_id);
    
    if ($this.val() === '') {
        reset();
        $this.removeClass('is-invalid');
    } else {
        var video_id = getVideoIdFromURL($this.val());
        
        if (video_id === null) {
            reset();
            $this.addClass('is-invalid');
        } else {
            $('#player').show();
            $this.removeClass('is-invalid');
            var status = player.loadVideoById(video_id);
            videoChanged = true;
        }
    }
});

$('#start').change( function () {
    let $this = $(this);
    let start = $this.val();
    
    if (start > duration) {
        start = duration;
        $this.val(duration);
    }

    let duration_value = $('#duration').val();

    if (parseFloat(start) + parseFloat(duration_value) > duration) {
        let new_duration = duration - start;
        $('#duration').val(duration - start);
        duration_value = new_duration;
    }
    
    $('#end').val(parseFloat(start) + parseFloat(duration_value));

    applyChanges(start, duration_value)
});

$('#duration').change( function () {
    let new_duration = $(this).val();
    let start = $('#start').val();
    let new_end = parseFloat(start) + parseFloat(new_duration);

    if (new_end > duration) {
        new_end = duration;
        new_duration = new_end - start;
        $(this).val(new_duration);
    }

    $('#end').val(new_end);

    applyChanges(start, new_duration)
});

$('#end').change( function () {
    let new_end = $(this).val();

    if (parseFloat(new_end) > duration) {
        new_end = duration;
        $(this).val(duration);
    }

    let new_duration = new_end - $('#start').val();
    let $duration = $('#duration');

    if (new_duration < 0) {
        new_duration = 0;
    }

    $duration.val(new_duration);
    $duration.trigger('change');
});

$('.sum').click(function () {
    var $this = $(this);
    var $input = $this.parents('.input-group').find('input');
    var old_value = $input.val();
    
    if (old_value === '') {
        old_value = 0;
    }
    
    $input.val(parseFloat(parseFloat(old_value) + parseFloat($this.data('amount'))).toFixed(1));
    $input.trigger('change');
});

$('.subtract').click(function () {
    var $this = $(this);
    var $input = $this.parents('.input-group').find('input');
    var old_value = $input.val();
    
    if (old_value === '') {
        old_value = 0;
    }
    
    var result = parseFloat(old_value) - parseFloat($this.data('amount'));
    
    if (result < 0) {
        result = 0;
    }
    
    $input.val(parseFloat(result).toFixed(1));
    $input.trigger('change');
});

function handleFile() {
    const fileList = this.files;
    const reader = new FileReader();

    reader.addEventListener('load', (event) => {
        processFile(event.target.result);
    });
    
    reader.readAsText(fileList[0]);
}

$(document).ready(function () {
    bsCustomFileInput.init()

    const inputElement = document.getElementById("chords-file");
    inputElement.addEventListener("change", handleFile, false);
});