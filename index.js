const tcp = require('../../tcp')
const instance_skel = require('../../instance_skel')

class instance extends instance_skel {
	constructor(system, id, config) {
		super(system, id, config)
		let self = this

		self.initActions()
		self.initFeedback()
		self.initPresets()

		self.status(self.STATUS_UNKNOWN, '')
	}

	config_fields() {
		let self = this

		return [
			{
				type: 'text',
				id: 'info',
				width: 12,
				label: 'Information',
				value: 'This module controls DSXXX relay boards with raw TCP commands on default port 17123.',
			},
			{
				type: 'textinput',
				id: 'host',
				label: 'Target IP',
				width: 6,
				regex: self.REGEX_IP,
			},
		]
	}

	init() {
		let self = this

		self.initTcp()
		self.initVariables()
	}

	initTcp() {
		let self = this

		if (self.socket !== undefined) {
			self.socket.destroy()
			delete self.socket
		}

		if (self.config.port === undefined) {
			self.config.port = 17123
		}

		if (self.config.host !== undefined) {
			self.socket = new tcp(self.config.host, self.config.port)

			self.status(self.STATE_WARNING, 'Connecting')

			self.socket.on('status_change', (status, message) => {
				self.status(status, message)
			})

			self.socket.on('error', (err) => {
				self.debug('Network error', err)
				self.status(self.STATE_ERROR, err)
				self.log('error', 'Network error: ' + err.message)
			})

			self.socket.on('connect', () => {
				self.status(self.STATE_OK)
				self.debug('Connected')
			})

			self.socket.on('data', (data) => {
				console.log(data)
			})
		}
	}

	destroy() {
		let self = this

		if (self.socket !== undefined) {
			self.socket.destroy()
		}

		self.debug('destroy', self.id)
	}

	initActions() {
		let self = this
		let actions = {}

		actions['set_relay_single'] = {
			label: 'Set Relay State',
			options: [
				{
					type: 'number',
					label: 'Index',
					id: 'index',
					min: 1,
					max: 32,
					default: 1,
					step: 1,
					required: true,
				},
				{
					type: 'dropdown',
					label: 'Select State',
					id: 'state',
					default: 'on',
					choices: [
						{ id: 'on', label: 'On' },
						{ id: 'off', label: 'Off' },
					],
				},
				{
					type: 'number',
					label: 'On time (ms)',
					id: 'period',
					min: 0,
					max: 10000,
					default: 0,
					step: 1,
					required: true,
				},
			],
			callback: (action, bank) => {
				let opt = action.options
				let index = opt.index
				let state = opt.state
				let period = opt.period
				self.sendCommand('SR ' + index + ' ' + state + ' ' + period)
			},
		}

		actions['set_output_single'] = {
			label: 'Set Output State',
			options: [
				{
					type: 'number',
					label: 'Index',
					id: 'index',
					min: 1,
					max: 32,
					default: 1,
					step: 1,
					required: true,
				},
				{
					type: 'dropdown',
					label: 'Select State',
					id: 'state',
					default: 'on',
					choices: [
						{ id: 'on', label: 'On' },
						{ id: 'off', label: 'Off' },
					],
				},
			],
			callback: (action, bank) => {
				let opt = action.options
				let index = opt.index
				let state = opt.state
				self.sendCommand('SO ' + index + ' ' + state)
			},
		}

		self.setActions(actions)
	}

	initFeedback() {
		let self = this
		let feedbacks = {}

		self.setFeedbackDefinitions(feedbacks)
	}

	initVariables() {
		let self = this

		let variables = []

		self.setVariableDefinitions(variables)
	}

	initPresets() {
		let self = this
		let presets = []

		self.setPresetDefinitions(presets)
	}

	updateConfig(config) {
		let self = this

		self.config = config

		self.initTcp()
	}

	updateVariables(data, patch) {
		let self = this
	}

	sendCommand(data) {
		let self = this

		let sendBuf = Buffer.from(data + '\n', 'latin1')

		if (sendBuf != '') {
			this.debug('sending ', sendBuf, 'to', this.config.host)

			if (this.socket !== undefined && this.socket.connected) {
				this.socket.send(sendBuf)
			} else {
				this.debug('Socket not connected :(')
			}
		}
	}
}

exports = module.exports = instance
