// Roland-M5000

var tcp = require('../../tcp');
var instance_skel = require('../../instance_skel');
var debug;
var log;

function instance(system, id, config) {
	var self = this;

	// super-constructor
	instance_skel.apply(this, arguments);

	self.actions(); // export actions

	return self;
}

instance.prototype.CHOICES_CHANNELS_INPUT = [];
instance.prototype.CHOICES_CHANNELS_SUBGROUP = [];
instance.prototype.CHOICES_CHANNELS_AUX = [];
instance.prototype.CHOICES_CHANNELS_MIXMINUS = [];
instance.prototype.CHOICES_CHANNELS_MATRIX = [];
instance.prototype.CHOICES_CHANNELS_MAIN = [];
instance.prototype.CHOICES_CHANNELS_MONITOR = [];
instance.prototype.CHOICES_CHANNELS_DCA = [];
instance.prototype.CHOICES_MUTE_GROUPS = [];
instance.prototype.CHOICES_USER_FADERS = [];

instance.prototype.updateConfig = function(config) {
	var self = this;

	self.config = config;
	self.init_tcp();
}

instance.prototype.init = function() {
	var self = this;

	debug = self.debug;
	log = self.log;

	for (let i = 1; i <= 128; i++) {
		let channelObj = {};
		channelObj.id = 'I' + i;
		channelObj.label = 'Channel ' + i;
		self.CHOICES_CHANNELS_INPUT.push(channelObj);
	}

	for (let i = 1; i <= 64; i++) {
		let channelObj = {};
		channelObj.id = 'SG' + i;
		channelObj.label = 'Subgroup ' + i;
		self.CHOICES_CHANNELS_SUBGROUP.push(channelObj);
	}

	for (let i = 1; i <= 64; i++) {
		let channelObj = {};
		channelObj.id = 'AX' + i;
		channelObj.label = 'Aux ' + i;
		self.CHOICES_CHANNELS_AUX.push(channelObj);
	}

	for (let i = 1; i <= 64; i++) {
		let channelObj = {};
		channelObj.id = 'MM' + i;
		channelObj.label = 'Mix Minus ' + i;
		self.CHOICES_CHANNELS_MIXMINUS.push(channelObj);
	}

	for (let i = 1; i <= 64; i++) {
		let channelObj = {};
		channelObj.id = 'MX' + i;
		channelObj.label = 'Matrix ' + i;
		self.CHOICES_CHANNELS_MATRIX.push(channelObj);
	}

	for (let i = 1; i <= 2; i++) {
		let channelObj = {};
		channelObj.id = 'MA' + i;
		channelObj.label = 'Main ' + i;
		self.CHOICES_CHANNELS_MAIN.push(channelObj);
	}

	for (let i = 1; i <= 2; i++) {
		let channelObj = {};
		channelObj.id = 'MON' + i;
		channelObj.label = 'Monitor ' + i;
		self.CHOICES_CHANNELS_MONITOR.push(channelObj);
	}

	for (let i = 1; i <= 24; i++) {
		let channelObj = {};
		channelObj.id = 'DCA' + i;
		channelObj.label = 'DCA ' + i;
		self.CHOICES_CHANNELS_DCA.push(channelObj);
	}

	for (let i = 1; i <= 8; i++) {
		let channelObj = {};
		channelObj.id = 'MG' + i;
		channelObj.label = 'Mute Group ' + i;
		self.CHOICES_MUTE_GROUPS.push(channelObj);
	}

	for (let i = 1; i <= 3; i++) {
		let channelObj = {};
		for (let j = 1; j <= 64; j++) {
			channelObj.id = 'U' + ((64 * i) - 64 + j);
			channelObj.label = 'User ' + i + ': Fader ' + j;
			self.CHOICES_CHANNELS_INPUT.push(channelObj);
		}
	}

	self.init_tcp();
}

instance.prototype.init_tcp = function() {
	var self = this;
	var receivebuffer = '';

	if (self.socket !== undefined) {
		self.socket.destroy();
		delete self.socket;
	}

	if (self.config.port === undefined) {
		self.config.port = 8023;
	}

	if (self.config.host) {
		self.socket = new tcp(self.config.host, self.config.port);

		self.socket.on('status_change', function (status, message) {
			self.status(status, message);
		});

		self.socket.on('error', function (err) {
			debug('Network error', err);
			self.log('error','Network error: ' + err.message);
		});

		self.socket.on('connect', function () {
			debug('Connected');
		});

		self.socket.on('data', function(buffer) {
			var indata = buffer.toString('utf8');
			//future feedback can be added here
		});

	}
};

// Return config fields for web config
instance.prototype.config_fields = function () {
	var self = this;

	return [
		{
			type: 'text',
			id: 'info',
			width: 12,
			label: 'Information',
			value: 'This module will connect to a Roland M-5000 Audio Console.'
		},
		{
			type: 'textinput',
			id: 'host',
			label: 'IP Address',
			width: 6,
			default: '192.168.0.1',
			regex: self.REGEX_IP
		}
	]
};

// When module gets deleted
instance.prototype.destroy = function() {
	var self = this;

	if (self.socket !== undefined) {
		self.socket.destroy();
	}

	debug('destroy', self.id);
}

instance.prototype.actions = function() {
	var self = this;

	self.system.emit('instance_actions', self.id, {

		'inputchannel_phantompower': {
			label: 'Input Channel Phantom Power',
			options: [
				{
					type: 'dropdown',
					label: 'Channel',
					id: 'channel',
					default: 'I1',
					choices: self.CHOICES_CHANNELS_INPUT
				},
				{
					type: 'dropdown',
					label: 'On/Off',
					id: 'onoff',
					default: '0',
					choices: [
						{ id: '1', label: 'On'},
						{ id: '0', label: 'Off'}
					]
				}
			]
		},
		'userfader_phantompower': {
			label: 'User Fader Phantom Power',
			options: [
				{
					type: 'dropdown',
					label: 'Fader',
					id: 'channel',
					default: 'U1',
					choices: self.CHOICES_USER_FADERS
				},
				{
					type: 'dropdown',
					label: 'On/Off',
					id: 'onoff',
					default: '0',
					choices: [
						{ id: '1', label: 'On'},
						{ id: '0', label: 'Off'}
					]
				}
			]
		},
		'inputchannel_eq': {
			label: 'Input Channel EQ',
			options: [
				{
					type: 'dropdown',
					label: 'Channel',
					id: 'channel',
					default: 'I1',
					choices: self.CHOICES_CHANNELS_INPUT
				},
				{
					type: 'dropdown',
					label: 'On/Off',
					id: 'onoff',
					default: '0',
					choices: [
						{ id: '1', label: 'On'},
						{ id: '0', label: 'Off'}
					]
				}
			]
		},
		'subgroupchannel_eq': {
			label: 'Subgroup Channel EQ',
			options: [
				{
					type: 'dropdown',
					label: 'Channel',
					id: 'channel',
					default: 'SG1',
					choices: self.CHOICES_CHANNELS_SUBGROUP
				},
				{
					type: 'dropdown',
					label: 'On/Off',
					id: 'onoff',
					default: '0',
					choices: [
						{ id: '1', label: 'On'},
						{ id: '0', label: 'Off'}
					]
				}
			]
		},
		'auxchannel_eq': {
			label: 'Aux Channel EQ',
			options: [
				{
					type: 'dropdown',
					label: 'Channel',
					id: 'channel',
					default: 'AX1',
					choices: self.CHOICES_CHANNELS_AUX
				},
				{
					type: 'dropdown',
					label: 'On/Off',
					id: 'onoff',
					default: '0',
					choices: [
						{ id: '1', label: 'On'},
						{ id: '0', label: 'Off'}
					]
				}
			]
		},
		'mixminuschannel_eq': {
			label: 'Mix Minus Channel EQ',
			options: [
				{
					type: 'dropdown',
					label: 'Channel',
					id: 'channel',
					default: 'MM1',
					choices: self.CHOICES_CHANNELS_MIXMINUS
				},
				{
					type: 'dropdown',
					label: 'On/Off',
					id: 'onoff',
					default: '0',
					choices: [
						{ id: '1', label: 'On'},
						{ id: '0', label: 'Off'}
					]
				}
			]
		},
		'matrixchannel_eq': {
			label: 'Matrix Channel EQ',
			options: [
				{
					type: 'dropdown',
					label: 'Channel',
					id: 'channel',
					default: 'MX1',
					choices: self.CHOICES_CHANNELS_MATRIX
				},
				{
					type: 'dropdown',
					label: 'On/Off',
					id: 'onoff',
					default: '0',
					choices: [
						{ id: '1', label: 'On'},
						{ id: '0', label: 'Off'}
					]
				}
			]
		},
		'mainchannel_eq': {
			label: 'Main Channel EQ',
			options: [
				{
					type: 'dropdown',
					label: 'Channel',
					id: 'channel',
					default: 'MA1',
					choices: self.CHOICES_CHANNELS_MAIN
				},
				{
					type: 'dropdown',
					label: 'On/Off',
					id: 'onoff',
					default: '0',
					choices: [
						{ id: '1', label: 'On'},
						{ id: '0', label: 'Off'}
					]
				}
			]
		},
		'userfader_eq': {
			label: 'User Fader EQ',
			options: [
				{
					type: 'dropdown',
					label: 'Channel',
					id: 'channel',
					default: 'U1',
					choices: self.CHOICES_USER_FADERS
				},
				{
					type: 'dropdown',
					label: 'On/Off',
					id: 'onoff',
					default: '0',
					choices: [
						{ id: '1', label: 'On'},
						{ id: '0', label: 'Off'}
					]
				}
			]
		},
		'inputchannel_auxsendpanlevel': {
			label: 'Set Input Channel Aux Send/Aux Pan Level',
			options: [
				{
					type: 'dropdown',
					label: 'Input Channel',
					id: 'channel',
					default: 'I1',
					choices: self.CHOICES_CHANNELS_INPUT
				},
				{
					type: 'dropdown',
					label: 'Aux Channel',
					id: 'aux',
					default: 'AX1',
					choices: self.CHOICES_CHANNELS_AUX
				},
				{
					type: 'textinput',
					label: 'Aux Send Level (INF, -80.0 - 10.0) *0.1 dB steps',
					id: 'auxsendlevel',
					default: '0'
				},
				{
					type: 'textinput',
					label: 'Aux Pan (L100-C-R100) *Steps of 1',
					id: 'auxpan',
					default: 'C'
				}
			]
		},
		'userfader_auxsendpanlevel': {
			label: 'Set User Fader Aux Send/Aux Pan Level',
			options: [
				{
					type: 'dropdown',
					label: 'User Fader',
					id: 'channel',
					default: 'U1',
					choices: self.CHOICES_USER_FADERS
				},
				{
					type: 'dropdown',
					label: 'Aux Channel',
					id: 'aux',
					default: 'AX1',
					choices: self.CHOICES_CHANNELS_AUX
				},
				{
					type: 'textinput',
					label: 'Aux Send Level (INF, -80.0 - 10.0) *0.1 dB steps',
					id: 'auxsendlevel',
					default: '0'
				},
				{
					type: 'textinput',
					label: 'Aux Pan (L100-C-R100) *Steps of 1',
					id: 'auxpan',
					default: 'C'
				}
			]
		},
		'inputchannel_pan': {
			label: 'Set Input Channel Pan',
			options: [
				{
					type: 'dropdown',
					label: 'Input Channel',
					id: 'channel',
					default: 'I1',
					choices: self.CHOICES_CHANNELS_INPUT
				},
				{
					type: 'textinput',
					label: 'Pan (L100-C-R100) *Steps of 1',
					id: 'pan',
					default: 'C'
				}
			]
		},
		'subgroupchannel_pan': {
			label: 'Set Subgroup Channel Pan',
			options: [
				{
					type: 'dropdown',
					label: 'Subgroup Channel',
					id: 'channel',
					default: 'SG1',
					choices: self.CHOICES_CHANNELS_SUBGROUP
				},
				{
					type: 'textinput',
					label: 'Pan (L100-C-R100) *Steps of 1',
					id: 'pan',
					default: 'C'
				}
			]
		},
		'auxchannel_pan': {
			label: 'Set Aux Channel Pan',
			options: [
				{
					type: 'dropdown',
					label: 'aux Channel',
					id: 'channel',
					default: 'AX1',
					choices: self.CHOICES_CHANNELS_AUX
				},
				{
					type: 'textinput',
					label: 'Pan (L100-C-R100) *Steps of 1',
					id: 'pan',
					default: 'C'
				}
			]
		},
		'userfader_pan': {
			label: 'Set User Fader Pan',
			options: [
				{
					type: 'dropdown',
					label: 'User Fader',
					id: 'channel',
					default: 'U1',
					choices: self.CHOICES_USER_FADERS
				},
				{
					type: 'textinput',
					label: 'Pan (L100-C-R100) *Steps of 1',
					id: 'pan',
					default: 'C'
				}
			]
		},
		'inputchannel_mute': {
			label: 'Input Channel Mute',
			options: [
				{
					type: 'dropdown',
					label: 'Channel',
					id: 'channel',
					default: 'I1',
					choices: self.CHOICES_CHANNELS_INPUT
				},
				{
					type: 'dropdown',
					label: 'On/Off',
					id: 'onoff',
					default: '0',
					choices: [
						{ id: '1', label: 'On'},
						{ id: '0', label: 'Off'}
					]
				}
			]
		},
		'subgroupchannel_mute': {
			label: 'Subgroup Channel Mute',
			options: [
				{
					type: 'dropdown',
					label: 'Channel',
					id: 'channel',
					default: 'SG1',
					choices: self.CHOICES_CHANNELS_SUBGROUP
				},
				{
					type: 'dropdown',
					label: 'On/Off',
					id: 'onoff',
					default: '0',
					choices: [
						{ id: '1', label: 'On'},
						{ id: '0', label: 'Off'}
					]
				}
			]
		},
		'mixminuschannel_mute': {
			label: 'Mix Minus Channel Mute',
			options: [
				{
					type: 'dropdown',
					label: 'Channel',
					id: 'channel',
					default: 'MM1',
					choices: self.CHOICES_CHANNELS_MIXMINUS
				},
				{
					type: 'dropdown',
					label: 'On/Off',
					id: 'onoff',
					default: '0',
					choices: [
						{ id: '1', label: 'On'},
						{ id: '0', label: 'Off'}
					]
				}
			]
		},
		'matrixchannel_mute': {
			label: 'Matrix Channel Mute',
			options: [
				{
					type: 'dropdown',
					label: 'Channel',
					id: 'channel',
					default: 'MX1',
					choices: self.CHOICES_CHANNELS_MATRIX
				},
				{
					type: 'dropdown',
					label: 'On/Off',
					id: 'onoff',
					default: '0',
					choices: [
						{ id: '1', label: 'On'},
						{ id: '0', label: 'Off'}
					]
				}
			]
		},
		'mainchannel_mute': {
			label: 'Main Channel Mute',
			options: [
				{
					type: 'dropdown',
					label: 'Channel',
					id: 'channel',
					default: 'MA1',
					choices: self.CHOICES_CHANNELS_MAIN
				},
				{
					type: 'dropdown',
					label: 'On/Off',
					id: 'onoff',
					default: '0',
					choices: [
						{ id: '1', label: 'On'},
						{ id: '0', label: 'Off'}
					]
				}
			]
		},
		'dcachannel_mute': {
			label: 'DCA Channel Mute',
			options: [
				{
					type: 'dropdown',
					label: 'Channel',
					id: 'channel',
					default: 'DCA1',
					choices: self.CHOICES_CHANNELS_DCA
				},
				{
					type: 'dropdown',
					label: 'On/Off',
					id: 'onoff',
					default: '0',
					choices: [
						{ id: '1', label: 'On'},
						{ id: '0', label: 'Off'}
					]
				}
			]
		},
		'mutegroup_mute': {
			label: 'Mute Group Mute',
			options: [
				{
					type: 'dropdown',
					label: 'Channel',
					id: 'channel',
					default: 'MG1',
					choices: self.CHOICES_MUTE_GROUPS
				},
				{
					type: 'dropdown',
					label: 'On/Off',
					id: 'onoff',
					default: '0',
					choices: [
						{ id: '1', label: 'On'},
						{ id: '0', label: 'Off'}
					]
				}
			]
		},
		'userfader_mute': {
			label: 'User Fader Mute',
			options: [
				{
					type: 'dropdown',
					label: 'User Fader',
					id: 'channel',
					default: 'U1',
					choices: self.CHOICES_CHANNELS_AUX
				},
				{
					type: 'dropdown',
					label: 'On/Off',
					id: 'onoff',
					default: '0',
					choices: [
						{ id: '1', label: 'On'},
						{ id: '0', label: 'Off'}
					]
				}
			]
		},
		'inputchannel_faderlevel': {
			label: 'Input Channel Fader Level',
			options: [
				{
					type: 'dropdown',
					label: 'Input Channel',
					id: 'channel',
					default: 'I1',
					choices: self.CHOICES_CHANNELS_INPUT
				},
				{
					type: 'textinput',
					label: 'Fader level (INF, -80.0 - 10.0) *0.1 dB steps',
					id: 'level',
					default: '0'
				}
			]
		},
		'subgroupchannel_faderlevel': {
			label: 'Subgroup Channel Fader Level',
			options: [
				{
					type: 'dropdown',
					label: 'Subgroup Channel',
					id: 'channel',
					default: 'SG1',
					choices: self.CHOICES_CHANNELS_SUBGROUP
				},
				{
					type: 'textinput',
					label: 'Fader level (INF, -80.0 - 10.0) *0.1 dB steps',
					id: 'level',
					default: '0'
				}
			]
		},
		'auxchannel_faderlevel': {
			label: 'Aux Channel Fader Level',
			options: [
				{
					type: 'dropdown',
					label: 'Aux Channel',
					id: 'channel',
					default: 'AX1',
					choices: self.CHOICES_CHANNELS_AUX
				},
				{
					type: 'textinput',
					label: 'Fader level (INF, -80.0 - 10.0) *0.1 dB steps',
					id: 'level',
					default: '0'
				}
			]
		},
		'mixminuschannel_faderlevel': {
			label: 'Mix Minus Channel Fader Level',
			options: [
				{
					type: 'dropdown',
					label: 'Mix Minus Channel',
					id: 'channel',
					default: 'MM1',
					choices: self.CHOICES_CHANNELS_MIXMINUS
				},
				{
					type: 'textinput',
					label: 'Fader level (INF, -80.0 - 10.0) *0.1 dB steps',
					id: 'level',
					default: '0'
				}
			]
		},
		'mainchannel_faderlevel': {
			label: 'Main Channel Fader Level',
			options: [
				{
					type: 'dropdown',
					label: 'Main Channel',
					id: 'channel',
					default: 'MM1',
					choices: self.CHOICES_CHANNELS_MAIN
				},
				{
					type: 'textinput',
					label: 'Fader level (INF, -80.0 - 10.0) *0.1 dB steps',
					id: 'level',
					default: '0'
				}
			]
		},
		'monitorchannel_faderlevel': {
			label: 'Monitor Channel Fader Level',
			options: [
				{
					type: 'dropdown',
					label: 'Monitor Channel',
					id: 'channel',
					default: 'MON1',
					choices: self.CHOICES_CHANNELS_MONITOR
				},
				{
					type: 'textinput',
					label: 'Fader level (INF, -80.0 - 10.0) *0.1 dB steps',
					id: 'level',
					default: '0'
				}
			]
		},
		'dcachannel_faderlevel': {
			label: 'DCA Channel Fader Level',
			options: [
				{
					type: 'dropdown',
					label: 'DCA Channel',
					id: 'channel',
					default: 'DCA1',
					choices: self.CHOICES_CHANNELS_DCA
				},
				{
					type: 'textinput',
					label: 'Fader level (INF, -80.0 - 10.0) *0.1 dB steps',
					id: 'level',
					default: '0'
				}
			]
		},
		'userfader_faderlevel': {
			label: 'User Fader Level',
			options: [
				{
					type: 'dropdown',
					label: 'User Fader',
					id: 'channel',
					default: 'U1',
					choices: self.CHOICES_USER_FADERS
				},
				{
					type: 'textinput',
					label: 'Fader level (INF, -80.0 - 10.0) *0.1 dB steps',
					id: 'level',
					default: '0'
				}
			]
		},
		'inputchannel_relativefaderlevel': {
			label: 'Input Channel Relative Fader Level',
			options: [
				{
					type: 'dropdown',
					label: 'Input Channel',
					id: 'channel',
					default: 'I1',
					choices: self.CHOICES_CHANNELS_INPUT
				},
				{
					type: 'textinput',
					label: 'Relative fader level (-99.9 - 99.9) *0.1 dB steps',
					id: 'level',
					default: '0'
				}
			]
		},
		'subgroupchannel_relativefaderlevel': {
			label: 'Subgroup Channel Relative Fader Level',
			options: [
				{
					type: 'dropdown',
					label: 'Subgroup Channel',
					id: 'channel',
					default: 'SG1',
					choices: self.CHOICES_CHANNELS_SUBGROUP
				},
				{
					type: 'textinput',
					label: 'Relative fader level (-99.9 - 99.9) *0.1 dB steps',
					id: 'level',
					default: '0'
				}
			]
		},
		'auxchannel_relativefaderlevel': {
			label: 'Aux Channel Relative Fader Level',
			options: [
				{
					type: 'dropdown',
					label: 'Aux Channel',
					id: 'channel',
					default: 'AX1',
					choices: self.CHOICES_CHANNELS_AUX
				},
				{
					type: 'textinput',
					label: 'Relative fader level (-99.9 - 99.9) *0.1 dB steps',
					id: 'level',
					default: '0'
				}
			]
		},
		'mixminuschannel_relativefaderlevel': {
			label: 'Mix Minus Channel Relative Fader Level',
			options: [
				{
					type: 'dropdown',
					label: 'Mix Minus Channel',
					id: 'channel',
					default: 'MM1',
					choices: self.CHOICES_CHANNELS_MIXMINUS
				},
				{
					type: 'textinput',
					label: 'Relative fader level (-99.9 - 99.9) *0.1 dB steps',
					id: 'level',
					default: '0'
				}
			]
		},
		'mainchannel_relativefaderlevel': {
			label: 'Main Channel Relative Fader Level',
			options: [
				{
					type: 'dropdown',
					label: 'Main Channel',
					id: 'channel',
					default: 'MM1',
					choices: self.CHOICES_CHANNELS_MAIN
				},
				{
					type: 'textinput',
					label: 'Relative fader level (-99.9 - 99.9) *0.1 dB steps',
					id: 'level',
					default: '0'
				}
			]
		},
		'monitorchannel_relativefaderlevel': {
			label: 'Monitor Channel Relative Fader Level',
			options: [
				{
					type: 'dropdown',
					label: 'Monitor Channel',
					id: 'channel',
					default: 'MON1',
					choices: self.CHOICES_CHANNELS_MONITOR
				},
				{
					type: 'textinput',
					label: 'Relative fader level (-99.9 - 99.9) *0.1 dB steps',
					id: 'level',
					default: '0'
				}
			]
		},
		'dcachannel_relativefaderlevel': {
			label: 'DCA Channel Relative Fader Level',
			options: [
				{
					type: 'dropdown',
					label: 'DCA Channel',
					id: 'channel',
					default: 'DCA1',
					choices: self.CHOICES_CHANNELS_DCA
				},
				{
					type: 'textinput',
					label: 'Relative fader level (-99.9 - 99.9) *0.1 dB steps',
					id: 'level',
					default: '0'
				}
			]
		},
		'userfader_relativefaderlevel': {
			label: 'User Fader Relative Level',
			options: [
				{
					type: 'dropdown',
					label: 'User Fader',
					id: 'channel',
					default: 'U1',
					choices: self.CHOICES_USER_FADERS
				},
				{
					type: 'textinput',
					label: 'Relative fader level (-99.9 - 99.9) *0.1 dB steps',
					id: 'level',
					default: '0'
				}
			]
		},
		'scene_recall': {
			label: 'Recall Scene',
			options: [
				{
					type: 'textinput',
					label: 'Scene number (1.00-300.00) *Steps of 0.01',
					id: 'scene',
					default: '0'
				}
			]
		},
		'scene_relativerecall': {
			label: 'Recall Relative Scene',
			options: [
				{
					type: 'textinput',
					label: 'Relative scene number (-299-299) *Steps of 1',
					id: 'scene',
					default: '0'
				}
			]
		},
		'scene_store': {
			label: 'Store Scene',
			options: [
				{
					type: 'textinput',
					label: 'Scene number (1.00-300.00) *Steps of 0.01',
					id: 'scene',
					default: '0'
				},
				{
					type: 'textinput',
					label: 'Scene name (maximum 32 characters, variable length)',
					id: 'name',
					default: '0'
				},
				{
					type: 'number',
					label: 'Memory',
					id: 'memory',
					tooltip: 'M-48 memory number (0=Off, 01-16= Memory 1-16)',
					min: 0,
					max: 16,
					default: 0,
					required: true,
					range: true
				}
			]
		},
		'scene_create': {
			label: 'Create Scene',
			options: [
				{
					type: 'textinput',
					label: 'Scene name (maximum 32 characters, variable length)',
					id: 'name',
					default: '0'
				},
				{
					type: 'number',
					label: 'Memory',
					id: 'memory',
					tooltip: 'M-48 memory number (0=Off, 01-16= Memory 1-16)',
					min: 0,
					max: 16,
					default: 0,
					required: true,
					range: true
				}
			]
		},
		'brightness_display': {
			label: 'Display Brightness',
			options: [
				{
					type: 'number',
					label: 'Brightness Level',
					id: 'brightness',
					min: 0,
					max: 100,
					default: 75,
					required: true,
					range: true
				}
			]
		},
		'brightness_panel': {
			label: 'Panel Brightness',
			options: [
				{
					type: 'number',
					label: 'Brightness Level',
					id: 'brightness',
					min: 0,
					max: 100,
					default: 75,
					required: true,
					range: true
				}
			]
		},
		'brightness_lamp': {
			label: 'Lamp Brightness',
			options: [
				{
					type: 'number',
					label: 'Brightness Level',
					id: 'brightness',
					min: 0,
					max: 100,
					default: 75,
					required: true,
					range: true
				}
			]
		},
		'monitordimmer_onoff': {
			label: 'Monitor Dimmer On/Off',
			options: [
				{
					type: 'dropdown',
					label: 'Monitor Channel',
					id: 'channel',
					default: 'MON1',
					choices: self.CHOICES_CHANNELS_MONITOR
				},
				{
					type: 'dropdown',
					label: 'On/Off',
					id: 'onoff',
					default: '0',
					choices: [
						{ id: '1', label: 'On'},
						{ id: '0', label: 'Off'}
					]
				}
			]
		},
		'usb_start': {
			label: 'Start USB Recording'
		},
		'usb_stop': {
			label: 'Stop USB Recording'
		},
		'usb_pause': {
			label: 'Pause USB Recording'
		},
		'usb_jump': {
			label: 'Jump to USB Recording Location',
			options: [
				{
					type: 'textinput',
					label: 'Hour',
					id: 'hour',
					default: '0'
				},
				{
					type: 'textinput',
					label: 'Minute',
					id: 'minute',
					default: '0'
				},
				{
					type: 'textinput',
					label: 'Second',
					id: 'second',
					default: '0'
				}
			]
		},
		'usb_song': {
			label: 'Set USB Recording Song',
			options: [
				{
					type: 'textinput',
					label: 'Song Number (0-999: Song number; +1 - +999: Relative song number; -999 - -1: Relative song number; N : Next song; P : Previous song',
					id: 'song',
					default: '0'
				}
			]
		}
		
	});
}

instance.prototype.action = function(action) {

	var self = this;
	var cmd;
	var options = action.options;
	
	switch(action.action) {
		case 'inputchannel_phantompower':
		case 'userfader_phantompower':
			cmd = 'PTC:' + options.channel + ',' + options.onoff + ';';
			break;
		case 'inputchannel_eq':
		case 'subgroupchannel_eq':
		case 'auxchannel_eq':
		case 'mixminuschannel_eq':
		case 'matrixchannel_eq':
		case 'mainchannel_eq':
		case 'userfader_eq':
			cmd = 'EQC:' + options.channel + ',' + options.onoff + ';';
			break;
		case 'inputchannel_auxsendpanlevel':
		case 'userfader_auxsendpanlevel':
			cmd = 'AXC:' + options.channel + ',' + options.aux + ',' + options.auxsendlevel + ',' + options.auxpan + ';';
			break;
		case 'inputchannel_pan':
		case 'subgroupchannel_pan':
		case 'auxchannel_pan':
		case 'userfader_pan':
			cmd = 'PNC:' + options.channel + ',' + options.pan + ';';
			break;
		case 'inputchannel_mute':
		case 'subgroupchannel_mute':
		case 'mixminuschannel_mute':
		case 'matrixchannel_mute':
		case 'mainchannel_mute':
		case 'dcachannel_mute':
		case 'mutegroup_mute':
		case 'userfader_mute':
			cmd = 'MUC:' + options.channel + ',' + options.onoff + ';';
			break;
		case 'inputchannel_faderlevel':
		case 'subgroupchannel_faderlevel':
		case 'auxchannel_faderlevel':
		case 'mixminuschannel_faderlevel':
		case 'mainchannel_faderlevel':
		case 'monitorchannel_faderlevel':
		case 'dcachannel_faderlevel':
		case 'userfader_faderlevel':
			cmd = 'FDC:' + options.channel + ',', options.level + ';';
			break;
		case 'inputchannel_relativefaderlevel':
		case 'subgroupchannel_relativefaderlevel':
		case 'auxchannel_relativefaderlevel':
		case 'mixminuschannel_relativefaderlevel':
		case 'mainchannel_relativefaderlevel':
		case 'monitorchannel_relativefaderlevel':
		case 'dcachannel_relativefaderlevel':
		case 'userfader_relativefaderlevel':
			cmd = 'RFC:' + options.channel + ',', options.level + ';';
			break;
		case 'scene_recall':
			cmd = 'SCC:' + options.scene + ';';
			break;
		case 'scene_relativerecall':
			cmd = 'RSC:' + options.scene + ';';
			break;
		case 'scene_store':
			cmd = 'SSC:' + options.scene + ',' + options.name + ',' + options.memory + ';';
			break;
		case 'scene_create':
			cmd = 'SNC:' + options.name + ',' + options.memory + ';';
			break;
		case 'brightness_display':
			cmd = 'DBC:' + options.brightness + ';';
			break;
		case 'brightness_panel':
			cmd = 'PBC:' + options.brightness + ';';
			break;
		case 'brightness_lamp':
			cmd = 'LBC:' + options.brightness + ';';
			break;
		case 'monitordimmer_onoff':
			cmd = 'DMC:' + options.channel + ',' + options.onoff + ';';
			break;
		case 'usb_start':
			cmd = 'RTC:' + 'P;';
			break;
		case 'usb_stop':
			cmd = 'RTC:' + 'S;';
			break;
		case 'usb_pause':
			cmd = 'RTC:' + 'R;';
			break;
		case 'usb_jump':
			cmd = 'RLC:' + options.hour + 'h' + options.minute + 'm' + options.second + 's;';
			break;
		case 'usb_song':
			cmd = 'RIC:' + options.song + ';';
			break;
	}

	if (cmd !== undefined) {
		if (self.socket !== undefined && self.socket.connected) {
			self.socket.send('\u0002' + cmd);
		} else {
			debug('Socket not connected :(');
		}

	}
};

instance_skel.extendedBy(instance);
exports = module.exports = instance;
