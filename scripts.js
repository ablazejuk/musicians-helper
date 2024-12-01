// 2. This code loads the IFrame Player API code asynchronously.
let tag = document.createElement('script');

tag.src = "https://www.youtube.com/iframe_api";
let firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

// 3. This function creates an <iframe> (and YouTube player)
//    after the API code downloads.
let player;
let videoChanged = false;
let duration = null;
let node_index = 0;
let rows_dictionary = {};
const MAX_CHARS_PER_LINE = 36;

function getVideoIdFromURL(url) {
    const urlParams = new URLSearchParams((new URL(url)).search);
    return urlParams.get('v');
}

function onYouTubeIframeAPIReady() {
    const screenWidth = window.innerWidth;
    let playerWidth, playerHeight;

    if (screenWidth >= 1200) {
        playerWidth = 640;
        playerHeight = 360;
    } else if (screenWidth >= 768) {
        playerWidth = 480;
        playerHeight = 270;
    } else {
        playerWidth = 320;
        playerHeight = 180;
    }

    player = new YT.Player(getPlayerId(), {
        height: playerHeight.toString(),
        width: playerWidth.toString(),
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange
        }
    });
}

// 4. The API will call this function when the video player is ready.
function onPlayerReady(event) {
}

let interval_id = null;
let scroll_event_id = null;

function registerScrollEvent() {
    node_index++;
    
    if (!(node_index in rows_dictionary)) {
        return;
    }
    
    let start = rows_dictionary[node_index].start;
    let current_time = Math.round(player.getCurrentTime() * 1000);
    let time_to_wait = (moment(start, 'HH:mm:ss.SSS').valueOf() - moment("00:00:00:000", 'HH:mm:ss.SSS').valueOf() - current_time);

    scroll_event_id = setTimeout(function () {
        $('#' + (node_index-1)).removeClass('current-node');
        $('#' + node_index).get(0).scrollIntoView({
            block: "center"
        });
        $('#' + node_index).addClass('current-node');

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
        
        let $duration = $('#duration');
        
        if (videoChanged) {
            duration = player.getDuration();
            $duration.val(duration.toFixed(1));
            $('#start').val(0);
            $('#end').val(duration.toFixed(1));
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
    clearTimeout(scroll_event_id);
    scroll_event_id = null;
    $('#' + (node_index-1)).removeClass('current-node');
    node_index = 0;
    player.seekTo(document.getElementById('start').value);
}

function applyChanges(duration) {
    clearInterval(interval_id);
    seekToStart();
    interval_id = setInterval(seekToStart, duration * 1000);
}

function reset() {
    player.stopVideo();
    $('#duration').val('');
    $('#start').val('');
    getJQueryPlayer().hide();
}

function processFile(file_contents) {
    let rows = file_contents.split(/\r?\n/);
    let element_row_index = 0;
    let row_object = {};
    const errors = [];

    rows.forEach(function (row, index) {
        if (row.startsWith('#')) {
            processMetadata(row);
            return;
        }

        element_row_index++

        switch (element_row_index) {
            case 1:
                row_object.index = row;
                break;
            case 2:
                [row_object.start, row_object.end] = row.split(' --> ');
                break;
            case 3:
                validateMaxCharsPerLine(errors, row, index);
                row_object.chords = row;
                break;
            case 4:
                validateMaxCharsPerLine(errors, row, index);
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

    if (errors.length > 0) {
        alert(errors.join('\n'));
    }

    seekToStart();
}

$('#video-url').change(function () {
    let $this = $(this);

    clearInterval(interval_id);
    
    if ($this.val() === '') {
        reset();
        $this.removeClass('is-invalid');
    } else {
        let video_id = getVideoIdFromURL($this.val());
        
        if (video_id === null) {
            reset();
            $this.addClass('is-invalid');
        } else {
            getJQueryPlayer().show();
            $this.removeClass('is-invalid');
            player.loadVideoById(video_id);
            videoChanged = true;
        }
    }
});

$('#start').change( function () {
    let $this = $(this);
    let start = $this.val();
    
    if (start > duration) {
        start = duration;
        $this.val(duration.toFixed(1));
    }

    let duration_value = $('#duration').val();

    if (parseFloat(start) + parseFloat(duration_value) > duration) {
        let new_duration = duration - start;
        $('#duration').val((duration - start).toFixed(1));
        duration_value = new_duration;
    }
    
    $('#end').val((parseFloat(start) + parseFloat(duration_value)).toFixed(1));

    applyChanges(duration_value)
});

$('#duration').change( function () {
    let new_duration = $(this).val();
    let start = $('#start').val();
    let new_end = parseFloat(start) + parseFloat(new_duration);

    if (new_end > duration) {
        new_end = duration;
        new_duration = new_end - start;
        $(this).val(new_duration.toFixed(1));
    }

    $('#end').val(new_end.toFixed(1));

    applyChanges(new_duration)
});

$('#end').change( function () {
    let new_end = $(this).val();

    if (parseFloat(new_end) > duration) {
        new_end = duration;
        $(this).val(duration.toFixed(1));
    }

    let new_duration = new_end - $('#start').val();
    let $duration = $('#duration');

    if (new_duration < 0) {
        new_duration = 0;
    }

    $duration.val(new_duration.toFixed(1));
    $duration.trigger('change');
});

$('.sum').click(function () {
    let $this = $(this);
    let $input = $this.parents('.input-group').find('input');
    let old_value = $input.val();
    
    if (old_value === '') {
        old_value = 0;
    }
    
    $input.val(parseFloat(parseFloat(old_value) + parseFloat($this.data('amount'))).toFixed(1));
    $input.trigger('change');
});

$('.subtract').click(function () {
    let $this = $(this);
    let $input = $this.parents('.input-group').find('input');
    let old_value = $input.val();
    
    if (old_value === '') {
        old_value = 0;
    }
    
    let result = parseFloat(old_value) - parseFloat($this.data('amount'));
    
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

function getPlayerId() {
    const isMobile = window.innerWidth <= 768;
    return isMobile ? 'mobile-player' : 'desktop-player';
}

function getJQueryPlayer() {
    return $('#' + getPlayerId());
}

$(document).ready(function () {
    bsCustomFileInput.init()

    const inputElement = document.getElementById("chords-file");
    inputElement.addEventListener("change", handleFile, false);
});

function processMetadata(row) {
    const content = row.slice(1);
    const separatorIndex = content.indexOf(":");

    if (separatorIndex === -1) {
        return;
    }

    const key = content.slice(0, separatorIndex).trim();
    const value = content.slice(separatorIndex + 1).trim();

    if (key === 'URL') {
        $('#video-url').val(value).change();
    }
}

function validateMaxCharsPerLine(errors, line, index) {
    if (reachedMaxCharsPerLine(line)) {
        if (errors.length === 0) {
            errors.push("Lines shouldn't have more than " + MAX_CHARS_PER_LINE + 
                " characters for better visualization in mobile devices:\n")
        }

        errors.push(getReachedMaxCharsPerLineMessage(index, line));
    }
}

function reachedMaxCharsPerLine(line) {
    return line.length > MAX_CHARS_PER_LINE;
}

function getReachedMaxCharsPerLineMessage(index, line) {
    return "Line " + (index + 1) + " is " + line.length + " characters long.";
}
