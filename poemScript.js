$(document).ready(function () {

    const content = new Object(); //directory of dictionaries
    let numLines = 5;
    let WPL = 10;

    const fillers = ['and', 'the', 'to', 'of' ,'is'];

    function loadApp() {
        $('#write').hide();
        $('#message').hide();
        $('#warning').hide();
        $('#sad').hide();
        $('#note').hide();
        $('#Info').on('click', function () {
            $('#infoModal').toggleClass('is-active');
        });
        $('#infoHide').on('click', function () {
            $('#infoModal').toggleClass('is-active');
        });
        $('#bankButton').on('click', function () {
            $('#bankModal').toggleClass('is-active');
        });
        $('#bankHide').on('click', function () {
            $('#bankModal').toggleClass('is-active');
        })
    }
    loadApp();

    $('#addquery').on('click', function () {
        $('.buttons').empty();
        $('#message').hide();
        let searchTerm = $('#Search').val().toLowerCase();
        $('#Search').val('');
        let regex = /\w+\s{0,1}/g;
        let regex2 = /[!\?;""'\/\\+=_,<>:\[\]\|\{\}\-]/g
        let regex3 = /\d+/g
        if (regex.test(searchTerm) && !regex2.test(searchTerm) && !regex3.test(searchTerm) && searchTerm.length <= 30) {
            $('#globe').addClass('spinning');
            MakeDictionary(searchTerm);

        }
        else {
            notice('Invalid search. See info', 'warning')
        }
    });

    $('#removequery').on('click', function () {
        $('#list').children().last().remove();
    })

    $('ul').on('click', '.far', function (e) {
        e.stopPropagation();
        $(this).parent().fadeOut(500, function () {
            $(this).parent().remove();
        })
    });

    $('#write a').click(function (e) {
        e.preventDefault();
        $('#write').hide();
        $('#box-content').show();
        $('#PoemBox').html(`<p>Powered by Wikipedia's API. See <span class="icon"><i class="fas fa-info-circle fa-lg"></i></span>.</p>`);
    });

    $('#generate').on('click', function () {
        if ($('#list').text().length > 34) {
            $('#PoemBox').html('');
            let listArr = $('.list-item').text().split(',').filter(e => e);
            listArr = listArr.map(item => content[item])
            let DICT = Dictionary.merge(...listArr);
            let POEM = new Poem(DICT, numLines, WPL).create();
            for (let line of POEM) {
                $('#PoemBox').append(line);
            }
            $('#write').show();
            $('#box-content').hide();
        }
        else {
            notice('No queries listed', 'warning')
        }
    });

    $('#numOfLines').change(function (e) {
        e.preventDefault();
        if ($(this).val() !== '0') {
            numLines = $(this).val();
            console.log(numLines);
        }
    });

    $('#wordsPerLine').change(function (e) {
        e.preventDefault();
        if ($(this).val() !== '0') {
            WPL = $(this).val();
            console.log(WPL);
        }
    });

    let searchCount = 0; //return if no match found after recursing twice
    function notice(notification, icon) {
        $('#note').text(notification);
        $('#note').show();
        $(`#${icon}`).show();
        $('#globe').hide();
        $('#globe').removeClass('spinning');
        setTimeout(() => {
            $('#note').text();
            $('#note').hide();
            $(`#${icon}`).hide();
            $('#globe').show();
        }, 2000);
    }
    function MakeDictionary(searchTerm) {
        $('#globe').addClass('spinning');
        if (!content[searchTerm]) {
            $.get(`https://cors-anywhere.herokuapp.com/https://en.wikipedia.org/w/api.php?format=json&action=query&prop=extracts&exintro&explaintext&redirects=1&titles=${searchTerm}`,
                function (data, textStatus, jqXHR) {
                    if(textStatus !== 'success'){
                        notice('There was a server error.', 'sad')
                        return;
                    }
                    let obj = data.query.pages;
                    let theText = '';
                    for (let key in obj) {
                        if (obj[key].extract) {
                            theText += obj[key].extract;
                        }
                        else {
                            notice(`No results found`, 'sad')
                            return;
                        }
                    }
                    let redirectEX = /refer[s]*\sto:/;
                    if (redirectEX.test(theText)) {
                        console.log('hi');
                        let parseEX = new RegExp(`\\w*\\s*${searchTerm}` + "\\s*\\(*.+\\)*[,|\n]", "gmi");
                        let parsedQueries = theText.match(parseEX);
                        if (parsedQueries !== null) {
                            parsedQueries = parsedQueries.slice(1);
                            parsedQueries.forEach(query => {
                                query = query.slice(0, query.indexOf(','))
                                query = query.replace(/\s*\(*born\s*\d+\)*/, '')
                                $('.buttons').append(`<button class="button is-info is-small queryButton">${query}</button>`);
                            })
                            searchCount++;
                            if (searchCount > 2) {
                                $('.buttons').empty();
                                $('#message').hide();
                                searchCount = 0;
                                notice('No results found', 'sad')
                                return;
                            }
                            $('.queryButton').on('click', function () {
                                let term = $(this).text();
                                MakeDictionary(term);
                                $('.buttons').empty();
                                $('#message').hide();
                            });
                            $('#message').show();
                            $('#globe').removeClass('spinning');
                            return;
                        }
                        else {
                            notice('No results found', 'sad')
                            return;
                        }
                    }
                    theText = theText.replace(/[\w]*\u2026/gi, '')
                    theText = theText.replace(/\(|\)/gm, ', '); //replace elipses and all parentheses
                    let dict = new Dictionary();
                    dict.learn(theText);
                    content[searchTerm] = dict;
                    $('#list').append(`<li class="list-item"><span><i class="far fa-trash-alt"></i></span><span class="icon"><i class="fas fa-pen-nib"></i></span>${searchTerm},</li>`);
                    $('#bankList').append(`<li>${searchTerm} (${dict.getsize()} words)</li>`);
                    $('#globe').removeClass('spinning');
                    return dict;
                },
            )
        }
        else if (content[searchTerm]) {
            $('#list').append(`<li class="list-item"><span class="icon"><i class="fas fa-pen-nib"></i></span>${searchTerm}</li>`);
            $('#globe').removeClass('spinning');
            return content[searchTerm]
        }
    }

    class Dictionary {
        constructor() {
            this.chain = {};
            this.strings = '';
        }
        learn(str) {
            let obj = this.chain;
            for (let word of fillers) {
                obj[word] = [];
            }
            str = str.replace(/[“]+|[”]+|["]+/g, ' ')
            str = str.replace(/\s[\.!:,;?]\s/gm, ', ')
            str = str.replace(/\s*,\s/g, ' ');
            str = str.replace(/undefined/gmi, ' ')
            this.strings = str;
            let strArr = str.split(/\.\s/)
            for (let i = 0; i < strArr.length; i++) {
                strArr[i] = strArr[i].split(/\s/);
            }
            for (let sentence of strArr) {
                for (let i = 0; i < sentence.length; i++) {
                    let word = sentence[i];
                    let nextWord = sentence[i + 1];

                    if (!obj[word] && nextWord !== undefined) {
                        obj[word] = [];
                        obj[word].push(nextWord)
                    }
                    else if (obj[word] && nextWord !== undefined) {
                        obj[word].push(nextWord)
                    }
                }
            }
            for (let key in obj) {
                if (obj[key].length < 2 && !fillers.includes(key)) {
                    let random = Math.floor(Math.random() * fillers.length);
                    let random2 = Math.floor(Math.random() * fillers.length);
                    obj[key].push(fillers[random]);
                    obj[key].push(fillers[random2])
                    obj[key].filter(e => e);
                }
                
            };
        }
        getsize() {
            return Object.keys(this.chain).length
        }
        display() {
            for (let key in this.chain) {
                console.log(key, this.chain[key])
            }
        }
        getStrings() {
            return this.strings;
        }
        static randomize(arr) {
            let newArr = [];
            for (let i = 0; i < arr.length; i++) {
                let random = Math.random();
                if (random >= .5) {
                    newArr.push(arr[i])
                }
                else if (random < .5) {
                    newArr.unshift(arr[i])
                }
            }
            return newArr;
        }
        static merge() {
            let newDict = new Dictionary();
            let arr = Array.from(arguments);
            let mixedArr = Dictionary.randomize(arr);
            let mergedStrings;
            for (let i = 0; i < mixedArr.length; i++) {
                mergedStrings += mixedArr[i].strings;
            }
            newDict.learn(mergedStrings);
            console.log(newDict.getsize());
            return newDict;
        }
    }

    class Poem {
        constructor(dictionary, numLines = 5, wpl = 10) {
            this.dictionary = dictionary;
            this.numLines = numLines;
            this.wpl = wpl; //Words per line
            this.poem = [];
            for (let j = 1; j <= numLines; j++) {
                this.poem.push([]);
            };
        }
        firstWords() {
            for (let i = 0; i < this.numLines; i++) {
                let keys = Object.keys(this.dictionary.chain)

                let randomize = Math.round(keys.length * Math.random())

                this.poem[i].push(keys[randomize]);
            }
        }
        theRest() {
            let chain = this.dictionary.chain;
            for (let j = 0; j < this.numLines; j++)
                for (let k = 0; k <= this.wpl; k++) {
                    let line = this.poem[j]; let previousWord = line[k];
                    if (chain[previousWord]) {
                        let random = Math.floor(chain[`${previousWord}`].length * Math.random())
                        line.push(chain[previousWord][random])
                    }
                    else if (!chain[previousWord]) {
                        let newWord = (fillers[Math.floor(Math.random() * 12)]);
                        if (newWord === previousWord) {
                            newWord = (fillers[Math.floor(Math.random() * 12)])
                        }
                    }
                }
        }
        create() {
            this.firstWords();
            this.theRest();
            return this.poem.map(line => {
                line = line.join(' ');
                let firstLetter;
                if (line[0]) {
                    firstLetter = line[0].toUpperCase();
                }
                line = `${firstLetter}${line.slice(1, line.length)}`
                return `<p>${line}</p><hr>`
            })
        }
    }
})