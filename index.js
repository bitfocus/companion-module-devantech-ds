const { InstanceBase, Regex, runEntrypoint, InstanceStatus } = require('@companion-module/base')
const tcp = require('tcp')

class instance extends InstanceBase {
	constructor(internal) {
		super(internal)

		this.updateStatus(InstanceStatus.Disconnected)
	}

	async init(config, firstInit) {
		let self = this

		this.config = config

		self.initTcp()

		self.initActions()
		self.initFeedback()
		self.initPresets()
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

		// Check if the IP was set.
		if (self.config.host === undefined || self.config.host.length === 0) {
			let msg = 'IP is not set'
			self.log('error', msg)
			self.updateStatus(InstanceStatus.BadConfig, msg)
			return
		}

		if (self.config.host !== undefined) {
			self.socket = tcp.createConnection(self.config.port, self.config.host)

			self.updateStatus(InstanceStatus.Connecting)

			self.socket.on('status_change', (status, message) => {
				self.updateStatus(InstanceStatus.UnknownWarning, message)
			})

			self.socket.on('error', (err) => {
				self.debug('Network error', err)
				self.updateStatus(InstanceStatus.ConnectionFailure, err)
				self.log('error', 'Network error: ' + err.message)
			})

			self.socket.on('connect', () => {
				self.updateStatus(InstanceStatus.Ok)
				self.debug('Connected')
			})

			self.socket.on('data', (data) => {
				console.log(data)
			})
		}
	}

	async destroy() {
		let self = this

		if (self.socket !== undefined) {
			self.socket.destroy()
		}

		self.debug('destroy', self.id)
	}

	getConfigFields() {
		return [
			{
				type: 'static-text',
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
				regex: Regex.IP,
			},
		]
	}

	async configUpdated(config) {
		this.config = config
		this.initTcp()
	}

	initActions() {
		let self = this
		let actions = {}

		actions['set_relay_single'] = {
			name: 'Set Relay State',
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
			callback: (event) => {
				let opt = event.options
				let index = opt.index
				let state = opt.state
				let period = opt.period
				self.sendCommand('SR ' + index + ' ' + state + ' ' + period)
			},
		}

		actions['set_output_single'] = {
			name: 'Set Output State',
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
			callback: (event) => {
				let opt = event.options
				let index = opt.index
				let state = opt.state
				self.sendCommand('SO ' + index + ' ' + state)
			},
		}

		this.setActionDefinitions(actions)
	}

	initFeedback() {
		let feedbacks = {}

		this.setFeedbackDefinitions(feedbacks)
	}

	initVariables() {
		let variables = []

		this.setVariableDefinitions(variables)
	}

	initPresets() {
		let presets = {}

		this.setPresetDefinitions(presets)
	}

	updateVariables(data, patch) {
		let self = this
	}

	sendCommand(data) {
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

runEntrypoint(instance, [])
