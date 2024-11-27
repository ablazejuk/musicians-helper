let selectedFile = null;

$('#chords-file-editor').change(function (event) {
    selectedFile = event.target.files[0];
});

$('#add-empty-line-button').click(function () {
    if (!selectedFile) {
        return;
    }

    const reader = new FileReader();
    
    reader.onload = function (e) {
        const lineNumber = $('#line-number').val();

        if (lineNumber === '') {
            return;
        }

        insertEmptyLineAtIndex(e.target.result, lineNumber);
    };
    
    reader.onerror = function () {
        console.error("Error reading file");
    };
    
    reader.readAsText(selectedFile);
});

function insertEmptyLineAtIndex(fileContent, index) {
    const inputFileContentArray = fileContent.split(/\r?\n/);
    let afterIndex = false;
    let elementRowIndex = 0;
    const outputFileContentArray = [];
    let lastInterval = '';

    inputFileContentArray.forEach(function (line) {
        if (!line.startsWith('#')) {
            elementRowIndex++
        }

        if (line === index) {
            afterIndex = true;
            outputFileContentArray.push(index);

            const lastIntervalEnd = lastInterval.split(' --> ')[1];
            const updatedInterval = lastIntervalEnd + ' --> ' + lastIntervalEnd;
            outputFileContentArray.push(updatedInterval);
            outputFileContentArray.push('');
            outputFileContentArray.push('');
            outputFileContentArray.push('');
        }

        let updatedLine = line;

        switch (elementRowIndex) {
            case 1:
                if (afterIndex) {
                    updatedLine = String(Number(line) + 1);
                }
                break;
            case 2:
                lastInterval = line;
                break;
            case 3:
            case 4:
                break;
            default:
                elementRowIndex = 0;
        }

        outputFileContentArray.push(updatedLine);
    });

    console.log(outputFileContentArray);
}