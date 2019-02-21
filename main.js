// DOM elements

let message_element 
let pulse_element

// Filtering constants

const detect_rate = 20 // times per second to sample audio

const target_freq = 800

const gamma = 0.5 // exponential time average

const thresh_value = 30
const debounce_ms = 30

// Morse code constants

const morse_unit = 300 // ms	

const dah_thresh = morse_unit * 2
const end_letter_thresh = morse_unit * 2
const space_thresh = morse_unit * 5

// Code scheme

const code_to_letter = {
	".-" : 		"A",
	"-..." : 	"B",
	"-.-." : 	"C",
	"-.." : 	"D",
	"." : 		"E",
	"..-." : 	"F",
	"--." : 	"G",
	"...." : 	"H",
	".." : 		"I",
	".---" : 	"J",
	"-.-" : 	"K",
	".-.." : 	"L",
	"--" : 		"M",
	"-." : 		"N",
	"---" : 	"O",
	".--." : 	"P",
	"--.-" : 	"Q",
	".-." : 	"R",
	"..." : 	"S",
	"-" : 		"T",
	"..-" : 	"U",
	"...-" : 	"V",
	".--" : 	"W",
	"-..-" : 	"X",
	"-.--" : 	"Y",
	"--.." : 	"Z",
	"----" :	"<br>",
	"other" :	"?",
}

// State

// Filtering
let time_avg = 0

let pulse = false
let last_0 = Date.now()
let last_1 = Date.now()

// Morse
let time_start = 0
let time_end = Date.now()

let letter = ''

window.onload = function() {
	// UI elements
	message_element = document.getElementById('message')
	pulse_element = document.getElementById('pulse')

	// grab an audio context
	const audio_ctx = new AudioContext()

	// ask for an audio input
	navigator.mediaDevices.getUserMedia({
		"audio": {
			"mandatory": {
			"googEchoCancellation": "false",
			"googAutoGainControl": "false",
			"googNoiseSuppression": "false",
			"googHighpassFilter": "false",
			},
			"optional": [],
		},
	}).then(stream => {
		const source = audio_ctx.createMediaStreamSource(stream)

		const filter = audio_ctx.createBiquadFilter()
		filter.type = 2; // Band pass
		filter.frequency.value = target_freq
		filter.Q.value = 32
		filter.gain.value = 2

		source.connect(filter)

		const analyser = audio_ctx.createAnalyser()
		analyser.smoothingTimeConstant = 0.3
		analyser.fftSize = 256

		source.connect(analyser)

		setInterval(() => { detect(analyser) }, 1000 / detect_rate)
	}).catch(err => {
		console.error('Could not get stream: ' + err)
		console.error(err.name + ": " + err.message)
	})
}

function detect(analyser) {
	const freq_array = new Uint8Array(analyser.frequencyBinCount);
	analyser.getByteFrequencyData(freq_array);

	let avg = 0
	for (let i = 12; i < 17; i++) {
		avg += freq_array[i]		
	}
	avg /= 17-12

	time_avg = gamma * avg + (1 - gamma) * time_avg

	const now = Date.now()

	// We use the time average to decide if the signal is high or low
		
	if (time_avg > thresh_value) {
		last_1 = now	
	} else {
		last_0 = now
	}

	// Debounce the signal

	if (pulse) {
		if (now - last_1 > debounce_ms) {
			pulse = false
			neg_edge()
		}
	} else {
		if (now - last_0 > debounce_ms) {
			pulse = true
			pos_edge()
		}
	}
}

function pos_edge() {
	time_start = Date.now()

	const ellapsed = time_start - time_end
	if (ellapsed > end_letter_thresh) {
		if (letter == '') return
		
		if (code_to_letter[letter]) {
			console.log(`${code_to_letter[letter]} (${letter})`)	
			message_element.innerHTML += code_to_letter[letter]
		} else {
			console.log(`${code_to_letter['other']} (${letter})`)
			message_element.innerHTML += code_to_letter['other']
		}
		letter = ''

		if (ellapsed > space_thresh) {
			console.log('SPACE')
			message_element.innerHTML += ' '
		}
	}

	pulse_element.classList.add('pulse-on')
}

function neg_edge() {
	time_end = Date.now()

	const ellapsed = time_end - time_start
	if (ellapsed > dah_thresh) {
		letter += '-'
	} else {
		letter += '.'
	}

	pulse_element.classList.remove('pulse-on')
}
