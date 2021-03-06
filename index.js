// Roland-M5000 and M2xx,3xx,4xx via serial bridge

let tcp = require("../../tcp");
let instance_skel = require("../../instance_skel");
const mixerconfig = require("./mixerconfig.json");

var debug;
var log;

class instance extends instance_skel {
  constructor(system, id, config) {
    super(system, id, config);

    this.cmdPipe = [];
    this.pollMixerTimer = undefined;
    this.watchlist = [];

    this.SCOPE_PHANTOM = [];
    this.SCOPE_EQ = [];
    this.SCOPE_PAN = [];
    this.SCOPE_MUTE = [];
    this.SCOPE_MUTE_GROUP = [];
    this.SCOPE_FADER = [];
    this.SCOPE_BRIGHTNESS = [];
    this.SCOPE_AUXSENDPANLEVEL = [];
  }

  destroy() {
    if (this.socket !== undefined) {
      this.socket.destroy();
    }

    if (this.pollMixerTimer !== undefined) {
      clearInterval(this.pollMixerTimer);
      delete this.pollMixerTimer;
    }

    debug("destroy", this.id);
  }

  init() {
    debug = this.debug;
    log = this.log;
    this.updateConfig(this.config);
  }

  updateConfig(config) {
    // polling is running and polling has been de-selected by config change
    if (this.pollMixerTimer !== undefined) {
      clearInterval(this.pollMixerTimer);
      delete this.pollMixerTimer;
    }
    this.config = config;

    this.config.log_fader_move_enabled =
      this.config.log_fader_move_enabled !== undefined
        ? this.config.log_fader_move_enabled
        : true;
    this.config.polling_enabled =
      this.config.polling_enabled !== undefined
        ? this.config.polling_enabled
        : true;
    this.config.range_errors_enabled =
      this.config.range_errors_enabled !== undefined
        ? this.config.range_errors_enabled
        : false;
    this.config.polling_enabled =
      this.config.polling_enabled !== undefined
        ? this.config.polling_enabled
        : true;
    this.config.polling_interval =
      this.config.polling_interval !== undefined
        ? this.config.polling_interval
        : 500;
    this.config.model =
      this.config.model !== undefined ? this.config.model : "M-5000";

    this.initMixerData();
    this.initVariables();
    this.init_tcp();

    this.initWatchlist();
    this.initActions();
    this.initFeedbacks();
    this.initPolling();

    this.initPresets();
  }

  initMixerData() {
    // mixer models have variant channel types, counts and function scopes
    let mx = mixerconfig["modelconfig"][this.config.model];
    const initChoiceArray = (topcount, category, labeltext) => {
      let result = [];

      if (topcount > 0) {
        for (let i = 1; i <= topcount; i++) {
          let channelObj = {};
          channelObj.id = category + i;
          channelObj.label = labeltext + i;
          result.push(channelObj);
        }
      }
      return result;
    };
    let CHOICES_CHANNELS_INPUT = initChoiceArray(mx.ICount, "I", "Channel ");
    let CHOICES_CHANNELS_SUBGROUP = initChoiceArray(
      mx.SGCount,
      "SG",
      "Subgroup "
    );
    let CHOICES_CHANNELS_AUX = initChoiceArray(mx.AXCount, "AX", "Aux ");
    let CHOICES_CHANNELS_MIXMINUS = initChoiceArray(
      mx.MMCount,
      "MM",
      "Mix Minus "
    );
    let CHOICES_CHANNELS_MATRIX = initChoiceArray(mx.MXCount, "MX", "Matrix ");
    let CHOICES_CHANNELS_MONITOR = initChoiceArray(
      mx.MONCount,
      "MON",
      "Monitor "
    );
    let CHOICES_CHANNELS_DCA = initChoiceArray(mx.DCACount, "DCA", "DCA ");
    let CHOICES_MUTE_GROUPS = initChoiceArray(mx.MGCount, "MG", "Mute Group ");
    let CHOICES_CHANNELS_RETURN = initChoiceArray(mx.RCount, "R", "Return ");

    //Returns have a stereo and split mono choice depending on function
    let CHOICES_CHANNELS_RETURN_MONO = [];
    if (mx.RCount > 0) {
      for (const item of CHOICES_CHANNELS_RETURN) {
        CHOICES_CHANNELS_RETURN_MONO.push({
          id: item.id + "L",
          label: item.label + "L ",
        });
        CHOICES_CHANNELS_RETURN_MONO.push({
          id: item.id + "R",
          label: item.label + "R ",
        });
      }
    }

    //User faders have a User structure in M-5000 and simpler in other models. This structure allows for both
    let CHOICES_CHANNELS_USER = [];
    for (let i = 1; i <= mx.UserSets; i++) {
      for (let j = 1; j <= mx.UCount; j++) {
        let channelObj = {};
        channelObj.id = "U" + (mx.UCount * i - mx.UCount + j);
        channelObj.label = "User " + i + ": Fader " + j;
        CHOICES_CHANNELS_USER.push(channelObj);
      }
    }

    // Now set up model variant choices
    let CHOICES_CHANNELS_MAIN = [];
    switch (this.config.model) {
      case "M-5000":
        CHOICES_CHANNELS_MAIN = [
          { id: "MA1", label: "Main 1" },
          { id: "MA2", label: "Main 2" },
        ];
        break;
      case "M-480":
      case "M-400":
      case "M-380":
      case "M-300":
        CHOICES_CHANNELS_MAIN = [
          { id: "MAL", label: "Main Left" },
          { id: "MAR", label: "Main Right" },
          { id: "MAC", label: "Main Centre" },
        ];
        break;
      case "M-200":
        CHOICES_CHANNELS_MAIN = [
          { id: "MAL", label: "Main Left" },
          { id: "MAR", label: "Main Right" },
        ];
        break;
    }

    //common scopes
    this.SCOPE_PHANTOM = [
      { channel: "input", choices: CHOICES_CHANNELS_INPUT },
      { channel: "user", choices: CHOICES_CHANNELS_USER },
    ];
    this.SCOPE_EQ = [
      { channel: "input", choices: CHOICES_CHANNELS_INPUT },
      { channel: "aux", choices: CHOICES_CHANNELS_AUX },
      { channel: "matrix", choices: CHOICES_CHANNELS_MATRIX },
      { channel: "main", choices: CHOICES_CHANNELS_MAIN },
      { channel: "user", choices: CHOICES_CHANNELS_USER },
    ];
    this.SCOPE_PAN = [
      { channel: "input", choices: CHOICES_CHANNELS_INPUT },
      { channel: "aux", choices: CHOICES_CHANNELS_AUX },
      { channel: "matrix", choices: CHOICES_CHANNELS_MATRIX },
      { channel: "user", choices: CHOICES_CHANNELS_USER },
    ];
    this.SCOPE_MUTE = [
      { channel: "input", choices: CHOICES_CHANNELS_INPUT },
      { channel: "aux", choices: CHOICES_CHANNELS_AUX },
      { channel: "matrix", choices: CHOICES_CHANNELS_MATRIX },
      { channel: "dca", choices: CHOICES_CHANNELS_DCA },
      { channel: "user", choices: CHOICES_CHANNELS_USER },
      { channel: "main", choices: CHOICES_CHANNELS_MAIN },
    ];
    this.SCOPE_MUTE_GROUP = [
      { channel: "mutegroup", choices: CHOICES_MUTE_GROUPS },
    ];
    this.SCOPE_FADER = [
      { channel: "input", choices: CHOICES_CHANNELS_INPUT },
      { channel: "aux", choices: CHOICES_CHANNELS_AUX },
      { channel: "matrix", choices: CHOICES_CHANNELS_MATRIX },
      { channel: "main", choices: CHOICES_CHANNELS_MAIN },
      { channel: "dca", choices: CHOICES_CHANNELS_DCA },
      { channel: "user", choices: CHOICES_CHANNELS_USER },
    ];
    this.SCOPE_AUXSENDPANLEVEL = [
      {
        channel: "input",
        choicesC: CHOICES_CHANNELS_INPUT,
        choicesA: CHOICES_CHANNELS_AUX,
      },
      {
        channel: "user",
        choicesC: CHOICES_CHANNELS_USER,
        choicesA: CHOICES_CHANNELS_AUX,
      },
    ];
    this.SCOPE_BRIGHTNESS = ["panel", "display"];

    // Now set up model variant scopes
    switch (this.config.model) {
      case "M-5000":
        this.SCOPE_EQ.push(
          { channel: "subgroup", choices: CHOICES_CHANNELS_SUBGROUP },
          { channel: "mixminus", choices: CHOICES_CHANNELS_MIXMINUS }
        );
        this.SCOPE_PAN.push({
          channel: "subgroup",
          choices: CHOICES_CHANNELS_SUBGROUP,
        });
        this.SCOPE_MUTE.push(
          { channel: "subgroup", choices: CHOICES_CHANNELS_SUBGROUP },
          { channel: "mixminus", choices: CHOICES_CHANNELS_MIXMINUS }
        );
        this.SCOPE_FADER.push(
          { channel: "subgroup", choices: CHOICES_CHANNELS_SUBGROUP },
          { channel: "mixminus", choices: CHOICES_CHANNELS_MIXMINUS },
          { channel: "monitor", choices: CHOICES_CHANNELS_MONITOR }
        );
        this.SCOPE_BRIGHTNESS.push("lamp");
        break;
      case "M-480":
        this.SCOPE_PHANTOM.push({
          channel: "return",
          choices: CHOICES_CHANNELS_RETURN_MONO,
        });
        this.SCOPE_PAN.push({
          channel: "return",
          choices: CHOICES_CHANNELS_RETURN_MONO,
        });
        this.SCOPE_MUTE.push({
          channel: "return",
          choices: CHOICES_CHANNELS_RETURN,
        });
        this.SCOPE_BRIGHTNESS.push("lamp");
        this.SCOPE_FADER.push({
          channel: "return",
          choices: CHOICES_CHANNELS_RETURN,
        });
        this.SCOPE_AUXSENDPANLEVEL.push({
          channel: "return",
          choicesC: CHOICES_CHANNELS_RETURN,
          choicesA: CHOICES_CHANNELS_AUX,
        });
        this.SCOPE_AUXSENDPANLEVEL.push({
          channel: "returnmono",
          choicesC: CHOICES_CHANNELS_RETURN_MONO,
          choicesA: CHOICES_CHANNELS_AUX,
        });
        break;
      case "M-400":
      case "M-380":
        this.SCOPE_BRIGHTNESS.push("lamp");
      case "M-300":
      case "M-200":
        break;
    }
  }

  init_tcp() {
    let pipeline = "";

    if (this.socket !== undefined) {
      this.socket.destroy();
      delete this.socket;
    }

    if (this.config.port === undefined) {
      this.config.port = 8023;
    }

    if (this.config.host) {
      this.socket = new tcp(this.config.host, this.config.port);

      this.socket.on("status_change", (status, message) => {
        this.status(status, message);
      });

      this.socket.on("error", (err) => {
        debug("Network error", err);
        this.log("error", "Network error: " + err.message);
      });

      this.socket.on("connect", () => {
        debug("Connected");
        this.initChannelNames(); // done at start or config change (they don't change very often so don't keep checking, keeps serial load down)
      });

      this.socket.on("data", (receivebuffer) => {
        pipeline += receivebuffer.toString("utf8");
        if (pipeline.length == 1 && pipeline.charAt(0) === "\u0006") {
          // process simple <ack> responses (06H) as these come back for all successsful Control commands
          this.cmdPipeNext();
          pipeline = "";
        } else {
          // partial response pipeline processing as TCP Serial module can return partial responses in stream. The VMXProxy service will always return complete responses
          // look for <stx> and ; bracketing
          if (pipeline.includes("\u0002") && pipeline.includes(";")) {
            // got at least one command terminated with ';'
            // multiple rapid Query strings can result in multiple responses so split response into individual messages
            let allresponses = pipeline.split(";");
            pipeline = allresponses.pop(); // last element will either be a partial response or an empty string from split where a complete pipeline ends with ';'
            for (let response of allresponses) {
              if (response.length > 0) {
                this.processResponse(response);
              }
            }
          }
        }
      });
    }
  }

  cmdPipeNext() {
    if (this.cmdPipe.length > 0) {
      return this.cmdPipe.pop();
    } else {
      this.log("error", "Unexpected response count (pipe underrun)");
      return "";
    }
  }
  processResponse(response) {
    // Chance of embedded <ack> responses. From previous pipeline split these will be at start of response
    while (response.charAt(0) !== "\u0002") {
      if (response.charAt(0) === "\u0006") {
        response = response.slice(1);
        this.cmdPipeNext();
      } else {
        this.log(
          "error",
          "Unexpected character in response: " +
            response.charAt(0) +
            " : Char code : " +
            response.charCodeAt(0)
        );
        response = response.slice(1);
      }
    }
    // Should be <stx><category><separator><argstring> - Separator is S: for reSponse, Q: for Query, C: for Control
    // A Query sent to the mixer will generate a matching reSponse (or an error)
    let pipeitem = this.cmdPipeNext();
    let startchar = response.charAt(0);
    if (startchar == "\u0002" && response.substring(1, 5) == "ERR:") {
      let errcode = response.substring(5, 6);
      let errstring = "";
      switch (errcode) {
        case "0":
          errstring = "(Syntax Error)";
          break;
        case "2":
          errstring = "(Busy Error)";
          break;
        case "5":
          errstring = "(Out of Range Error)";
          break;
        case "6":
          errstring = "(Something else Error)";
          break;
        default:
          errstring = "(UNKNOWN Error)";
          break;
      }
      if (errcode != "5" || this.config.range_errors_enabled) {
        // supress errors when hitting fader end stops and/or Main channel fader(Roland) false error bug
        this.log("error", "ERR: " + errstring + " - Command = " + pipeitem);
      }
    } else {
      let category = response.substring(1, 3);
      let settingseparator = response.substring(3, 5);
      let argstring = response.substring(5, response.length); // from start of params to end of string
      let args = argstring.split(","); // args[0] is usually a channel and args[1] a value
      if (
        startchar !== "\u0002" ||
        settingseparator !== "S:" ||
        args.length > 4
      ) {
        this.log("error", "Response not in expected format = " + response);
      } else {
        let keyvalue = this.buildWatchKey(category, args[0]);
        switch (category) {
          case "MU": // mute (polled)
          case "PT": // phantom (polled)
          case "EQ": // eq (polled)
            this.updateWatchItem(keyvalue, args);
            this.checkFeedbacks();
            break;
          case "CN": // channel name (start up)
            // remove enclosing quotes
            this.setVariable("name_" + args[0], args[1].replace(/^"|"$/g, ""));
            break;
          case "FD": // fader (polled)
            this.updateWatchItem(keyvalue, args);
            this.checkFeedbacks();
            break;
        }
      }
    }
  }

  sendCommmand(cmd) {
    if (cmd !== undefined) {
      if (this.socket !== undefined && this.socket.connected) {
        this.socket.send("\u0002" + cmd + ";");
        this.cmdPipe.unshift(cmd); // pipe buffer to match Commands and responSes asynchronously. Every command gets an <ack>, response or error.
      } else {
        debug("Socket not connected :(");
      }
    }
  }

  buildWatchKey(category, params) {
    //add Q(uery) separator to key as this is used as both watchlist key and as command to Query the mixer
    return category + "Q:" + params;
  }

  initWatchlist() {
    // at init/update create watchlist based on existing actions and feedbacks that need to Query the mixer
    // the watchlist is used to poll the mixer and kept to a minimum to control serial interface load
    // the watchlist contains a list of category / channel items which are polled and for each of these a list of the action/feedback ids attached to it
    // new categories will need to be added here, in message processing and as subscribe/unsubscribe in actions/feedbacks
    this.watchlist = new Map();
    this.getAllFeedbacks().forEach((item) => {
      if (item.type.slice(-4) == "mute") {
        this.addWatchItem("MU", item.options.channel, item.id);
      }
    });
    this.getAllActions().forEach((item) => {
      if (item.action.slice(-10) == "faderlevel") {
        this.addWatchItem("FD", item.options.channel, item.id);
      }
      if (item.action.slice(-4) == "mute") {
        this.addWatchItem("MU", item.options.channel, item.id);
      }
      if (item.action.slice(-2) == "eq") {
        this.addWatchItem("EQ", item.options.channel, item.id);
      }
    });
  }

  initPolling() {
    if (this.config.polling_enabled) {
      if (this.pollMixerTimer === undefined) {
        this.pollMixerTimer = setInterval(() => {
          for (const watchkeyvalue of this.watchlist.keys()) {
            this.sendCommmand(watchkeyvalue);
          }
        }, this.config.poll_interval);
      }
    }
  }

  addWatchItem(category, params, uniqueId) {
    let keyvalue = this.buildWatchKey(category, params);
    if (this.watchlist.has(keyvalue)) {
      let watchitem = this.watchlist.get(keyvalue);
      if (watchitem.ids === undefined) {
        watchitem.ids = new Set();
      }
      watchitem.ids.add(uniqueId);
    } else {
      this.watchlist.set(keyvalue, {
        ids: new Set([uniqueId]),
        args: [],
      });
    }
  }

  removeWatchItem(category, params, uniqueId) {
    let keyvalue = this.buildWatchKey(category, params);
    if (this.watchlist.has(keyvalue)) {
      let watchitem = this.watchlist.get(keyvalue);
      if (watchitem.ids !== undefined) {
        watchitem.ids.delete(uniqueId);
      }
      if (watchitem.ids.size == 0) {
        this.watchlist.delete(keyvalue);
      }
    }
  }

  updateWatchItem(keyvalue, args) {
    let watchitem = this.watchlist.get(keyvalue);
    if (watchitem === undefined) {
      this.log(
        "error",
        "Error, cannot update unknown watchlist item = " + keyvalue
      );
    } else {
      watchitem.args = args;
    }
  }

  config_fields() {
    return [
      {
        type: "text",
        id: "info",
        width: 12,
        label: "Information",
        value:
          "This module will connect to Roland M-5000 and M-2/3/4xx (serial) Audio Consoles.",
      },
      {
        type: "textinput",
        id: "host",
        label: "IP Address",
        width: 6,
        default: "192.168.0.1",
        regex: this.REGEX_IP,
      },
      {
        type: "dropdown",
        id: "model",
        label: "Console Model",
        width: 8,
        default: "M-5000",
        choices: [
          { id: "M-5000", label: "M-5000" },
          { id: "M-480", label: "M-480" },
          { id: "M-400", label: "M-400" },
          { id: "M-300", label: "M-300" },
          { id: "M-200", label: "M-200i" },
        ],
      },
      {
        type: "checkbox",
        id: "polling_enabled",
        label: "Enable Mixer Polling     :",
        default: true,
        width: 8,
      },
      {
        type: "number",
        id: "poll_interval",
        label: "Polling Interval (ms)",
        min: 300,
        max: 30000,
        default: 500,
        width: 8,
        regex: this.REGEX_NUMBER,
      },
      {
        type: "number",
        id: "rf_increment",
        label: "Relative Fader Increment",
        min: 0,
        max: 15,
        default: 1.5,
        width: 8,
        regex: this.REGEX_SIGNED_FLOAT,
      },
      {
        type: "checkbox",
        id: "log_fader_move_enabled",
        label: "Relative fader moves use log scaling    :",
        default: true,
        width: 8,
      },
      {
        type: "checkbox",
        id: "range_errors_enabled",
        label: "Enable Out Of Range Errors    :",
        default: false,
        width: 8,
      },
    ];
  }

  initChannelNames() {
    const getChannels = (choicelist) => {
      if (choicelist.length > 0) {
        for (const item of choicelist) {
          // a request for a channel name that has not been assigned on the mixer will result in an out of range ERR
          // and the variable will not be updated, so initialise here.
          this.setVariable("name_" + item.id, "empty");
          this.sendCommmand(this.buildWatchKey("CN", item.id));
        }
      }
    };
    // Named items are those covered by the mute scope as a superset of all channel type items
    this.SCOPE_MUTE.forEach((item) => {
      getChannels(item.choices);
    });
    this.SCOPE_MUTE_GROUP.forEach((item) => {
      getChannels(item.choices);
    });
  }

  initVariables() {
    let variables = [];
    const addVariables = (choicelist) => {
      if (choicelist.length > 0) {
        for (const item of choicelist) {
          variables.push({
            label: `${item.label} Name`,
            name: `name_${item.id}`,
          });
        }
      }
    };
    this.SCOPE_MUTE.forEach((item) => {
      addVariables(item.choices);
    });
    this.SCOPE_MUTE_GROUP.forEach((item) => {
      addVariables(item.choices);
    });

    this.setVariableDefinitions(variables);
  }

  initActions() {
    let actions = {};

    const switchAction = (aType, aLabel, aChoice) => {
      return {
        label: aLabel,
        options: [
          {
            type: "dropdown",
            label: "Channel",
            id: "channel",
            default: aChoice[0].id,
            choices: aChoice,
          },
          {
            type: "dropdown",
            label: "On/Off/Toggle",
            id: "switch",
            default: "T",
            choices: [
              { id: "1", label: "On" },
              { id: "0", label: "Off" },
              { id: "T", label: "Toggle" },
            ],
          },
        ],
        subscribe: (action) => {
          this.addWatchItem(aType, action.options.channel, action.id);
        },
        unsubscribe: (action) => {
          this.removeWatchItem(aType, action.options.channel, action.id);
        },
      };
    };

    const panAction = (aLabel, aChoice, aRange, anId2, aDefault2) => {
      return {
        label: aLabel,
        options: [
          {
            type: "dropdown",
            label: "Channel",
            id: "channel",
            default: aChoice[0].id,
            choices: aChoice,
          },
          {
            type: "textinput",
            label: aRange,
            id: anId2,
            default: aDefault2,
          },
        ],
      };
    };

    const faderAction = (aType, aLabel, aChoice, aRange, anId2, aDefault2) => {
      return {
        label: aLabel,
        options: [
          {
            type: "dropdown",
            label: "Channel",
            id: "channel",
            default: aChoice[0].id,
            choices: aChoice,
          },
          {
            type: "textinput",
            label: aRange,
            id: anId2,
            default: aDefault2,
          },
        ],
        subscribe: (action) => {
          this.addWatchItem(aType, action.options.channel, action.id);
        },
        unsubscribe: (action) => {
          this.removeWatchItem(aType, action.options.channel, action.id);
        },
      };
    };
    const auxPanFaderAction = (aLabel, anId, aChoiceC, aChoiceA) => {
      return {
        label: aLabel,
        options: [
          {
            type: "dropdown",
            label: anId,
            id: "channel",
            default: aChoiceC[0].id,
            choices: aChoiceC,
          },
          {
            type: "dropdown",
            label: "Aux Channel",
            id: "aux",
            default: aChoiceA[0].id,
            choices: aChoiceA,
          },
          {
            type: "textinput",
            label: "Aux Send Level (INF, -80.0 - 10.0) *0.1 dB steps",
            id: "auxsendlevel",
            default: "0",
          },
          {
            type: "textinput",
            label: "Aux Pan (L100-C-R100) *Steps of 1",
            id: "auxpan",
            default: "C",
          },
        ],
      };
    };
    const brightnessAction = (aLabel) => {
      return {
        label: aLabel,
        options: [
          {
            type: "number",
            label: "Brightness Level",
            id: "brightness",
            min: 0,
            max: 100,
            default: 75,
            required: true,
            range: true,
          },
        ],
      };
    };

    // common channel actions
    this.SCOPE_PHANTOM.forEach((item) => {
      actions[`${item.channel}_channel_phantompower`] = switchAction(
        "PT",
        `${item.channel.toUpperCase()} Channel Phantom Power`,
        item.choices
      );
    });

    this.SCOPE_EQ.forEach((item) => {
      actions[`${item.channel}_channel_eq`] = switchAction(
        "EQ",
        `${item.channel.toUpperCase()} Channel EQ`,
        item.choices
      );
    });
    this.SCOPE_PAN.forEach((item) => {
      actions[`${item.channel}_channel_pan`] = panAction(
        `${item.channel.toUpperCase()} Channel Pan`,
        item.choices,
        "Pan (L100-C-R100) *Steps of 1",
        "pan",
        "C"
      );
    });
    this.SCOPE_FADER.forEach((item) => {
      actions[`${item.channel}_channel_faderlevel`] = faderAction(
        "FD",
        `${item.channel.toUpperCase()} Channel Fader Level`,
        item.choices,
        "Fader level (INF, -80.0 - 10.0) *0.1 dB steps",
        "level",
        "0"
      );
    });
    this.SCOPE_FADER.forEach((item) => {
      actions[`${item.channel}_channel_relativefaderlevel`] = faderAction(
        "FD",
        `${item.channel.toUpperCase()} Channel Relative Fader Level`,
        item.choices,
        "Relative fader level (-99.9 - 99.9) *0.1 dB steps",
        "level",
        this.config.rf_increment.toString()
      );
    });
    this.SCOPE_AUXSENDPANLEVEL.forEach((item) => {
      actions[`${item.channel}_channel_auxsendpanlevel`] = auxPanFaderAction(
        `Set ${item.channel.toUpperCase()} Channel Aux Send/Aux Pan Level`,
        item.channel,
        item.choicesC,
        item.choicesA
      );
    });
    this.SCOPE_BRIGHTNESS.forEach((item) => {
      actions[`${item}_brightness`] = brightnessAction(
        `${item.toUpperCase()} Brightness`
      );
    });
    this.SCOPE_MUTE.forEach((item) => {
      actions[`${item.channel}_channel_mute`] = switchAction(
        "MU",
        `${item.channel.toUpperCase()} Channel Mute`,
        item.choices
      );
    });
    this.SCOPE_MUTE_GROUP.forEach((item) => {
      actions[`${item.channel}_channel_mute`] = switchAction(
        "MU",
        `${item.channel.toUpperCase()} Channel Mute`,
        item.choices
      );
    });

    // other actions
    actions["monitordimmer_onoff"] = {
      label: "Monitor Dimmer On/Off ",
      options: [
        {
          type: "dropdown",
          label: "On/Off/Toggle",
          id: "switch",
          default: "0",
          choices: [
            { id: "1", label: "On" },
            { id: "0", label: "Off" },
          ],
        },
      ],
    };

    actions["scene_recall"] = {
      label: "Recall Scene",
      options: [
        {
          type: "textinput",
          label: "Scene number (1-300) *299 for M-2/3/4xx mixers",
          id: "scene",
          default: "1",
        },
      ],
    };

    actions["scene_relativerecall"] = {
      label: "Recall Relative Scene",
      options: [
        {
          type: "textinput",
          label: "Relative scene number (-299-299)",
          id: "scene",
          default: "1",
        },
      ],
    };

    actions["scene_store"] = {
      label: "Store Scene",
      options: [
        {
          type: "textinput",
          label: "Scene number (1-300) *299 for M-2/3/4xx mixers",
          id: "scene",
          default: "1",
        },
        {
          type: "textinput",
          label: "Scene name (maximum 32 characters, variable length)",
          id: "name",
          default: "1",
        },
        {
          type: "number",
          label: "Memory",
          id: "memory",
          tooltip: "M-48 memory number (0=Off, 01-16= Memory 1-16)",
          min: 0,
          max: 16,
          default: 1,
          required: true,
          range: true,
        },
      ],
    };

    actions["scene_create"] = {
      label: "Create Scene",
      options: [
        {
          type: "textinput",
          label: "Scene name (maximum 32 characters, variable length)",
          id: "name",
          default: "1",
        },
        {
          type: "number",
          label: "Memory",
          id: "memory",
          tooltip: "M-48 memory number (0=Off, 01-16= Memory 1-16)",
          min: 0,
          max: 16,
          default: 1,
          required: true,
          range: true,
        },
      ],
    };

    actions["usb_start"] = {
      label: "Start USB Recording",
    };

    actions["usb_stop"] = {
      label: "Stop USB Recording",
    };

    actions["usb_pause"] = {
      label: "Pause USB Recording",
    };

    actions["usb_jump"] = {
      label: "Jump to USB Recording Location",
      options: [
        {
          type: "textinput",
          label: "Hour",
          id: "hour",
          default: "0",
        },
        {
          type: "textinput",
          label: "Minute",
          id: "minute",
          default: "0",
        },
        {
          type: "textinput",
          label: "Second",
          id: "second",
          default: "0",
        },
      ],
    };

    actions["usb_song"] = {
      label: "Set USB Recording Song",
      options: [
        {
          type: "textinput",
          label:
            "Song Number (0-999: Song number; +1 - +999: Relative song number; -999 - -1: Relative song number; N : Next song; P : Previous song",
          id: "song",
          default: "0",
        },
      ],
    };

    actions["userdefinedstring"] = {
      label: "User String",
      options: [
        {
          type: "textinput",
          label: "user string for testing",
          id: "ustring",
          default: "0",
        },
      ],
    };
    this.setActions(actions);
  }

  action(action) {
    let cmd;
    let options = action.options;

    const onOffToggleResult = (aType, aChannel, anOnOffToggle) => {
      if (anOnOffToggle == "T") {
        return this.watchlist.get(this.buildWatchKey(aType, aChannel))
          .args[1] == "1"
          ? "0"
          : "1";
      } else {
        return anOnOffToggle;
      }
    };
    const faderMove = (aChannel, aValue) => {
      // log value scaling of movement for fader
      let g = 4;
      let f = this.watchlist.get(this.buildWatchKey("FD", aChannel)).args[1];
      if (f === 0 || f === undefined) {
        f = 0.0001;
      }
      if (this.config.log_fader_move_enabled) {
        let result =
          Math.round(10 * (aValue * Math.exp(Math.log10(Math.abs(f / g))))) /
          10; // 1 decimal place
        return Math.abs(result) > Math.abs(aValue) ? result : aValue; // miniumum move is aValue
      } else {
        return Math.round(10 * aValue) / 10;
      }
    };

    switch (action.action) {
      case "input_channel_phantompower":
      case "user_channel_phantompower":
        cmd =
          "PTC:" +
          options.channel +
          "," +
          onOffToggleResult("PT", options.channel, options.switch);
        break;
      case "input_channel_eq":
      case "subgroup_channel_eq":
      case "aux_channel_eq":
      case "mixminus_channel_eq":
      case "matrix_channel_eq":
      case "main_channel_eq":
      case "user_channel_eq":
        cmd =
          "EQC:" +
          options.channel +
          "," +
          onOffToggleResult("EQ", options.channel, options.switch);
        break;
      case "input_channel_auxsendpanlevel":
      case "user_channel_auxsendpanlevel":
        cmd =
          "AXC:" +
          options.channel +
          "," +
          options.aux +
          "," +
          options.auxsendlevel +
          "," +
          options.auxpan.toUpperCase();
        break;
      case "input_channel_pan":
      case "subgroup_channel_pan":
      case "aux_channel_pan":
      case "user_channel_pan":
        cmd = "PNC:" + options.channel + "," + options.pan.toUpperCase();
        break;
      case "input_channel_mute":
      case "subgroup_channel_mute":
      case "mixminus_channel_mute":
      case "matrix_channel_mute":
      case "main_channel_mute":
      case "dca_channel_mute":
      case "mutegroup_mute":
      case "user_channel_mute":
      case "mutegroup_channel_mute":
        cmd =
          "MUC:" +
          options.channel +
          "," +
          onOffToggleResult("MU", options.channel, options.switch);
        break;
      case "input_channel_faderlevel":
      case "subgroup_channel_faderlevel":
      case "aux_channel_faderlevel":
      case "mixminus_channel_faderlevel":
      case "main_channel_faderlevel":
      case "monitor_channel_faderlevel":
      case "dca_channel_faderlevel":
      case "user_channel_faderlevel":
        cmd = "FDC:" + options.channel + "," + options.level;
        break;
      case "input_channel_relativefaderlevel":
      case "subgroup_channel_relativefaderlevel":
      case "aux_channel_relativefaderlevel":
      case "mixminus_channel_relativefaderlevel":
      case "main_channel_relativefaderlevel":
      case "monitor_channel_relativefaderlevel":
      case "dca_channel_relativefaderlevel":
      case "user_channel_relativefaderlevel":
        cmd =
          "RFC:" +
          options.channel +
          "," +
          faderMove(options.channel, options.level);
        break;
      case "scene_recall":
        cmd = "SCC:" + options.scene;
        break;
      case "scene_relativerecall":
        cmd = "RSC:" + options.scene;
        break;
      case "scene_store":
        cmd =
          "SSC:" + options.scene + "," + options.name + "," + options.memory;
        break;
      case "scene_create":
        cmd = "SNC:" + options.name + "," + options.memory;
        break;
      case "display_brightness":
        cmd = "DBC:" + options.brightness;
        break;
      case "panel_brightness":
        cmd = "PBC:" + options.brightness;
        break;
      case "lamp_brightness":
        cmd = "LBC:" + options.brightness;
        break;
      case "monitordimmer_onoff":
        cmd = "DMC:" + options.switch;
        break;
      case "usb_start":
        cmd = "RTC:" + "P";
        break;
      case "usb_stop":
        cmd = "RTC:" + "S";
        break;
      case "usb_pause":
        cmd = "RTC:" + "R";
        break;
      case "usb_jump":
        cmd =
          "RLC:" +
          options.hour +
          "h" +
          options.minute +
          "m" +
          options.second +
          "s";
        break;
      case "usb_song":
        cmd = "RIC:" + options.song;
        break;
      case "userdefinedstring":
        cmd = options.ustring;
        break;
      default:
        this.log("error", "Unknown Action: " + action.action);
    }
    this.sendCommmand(cmd);
  }

  initFeedbacks() {
    let feedbacks = {};

    const aSubscribeLevelFeedback = (aType, aLabel, aChoice) => {
      return {
        label: aLabel,
        description: "Show " + aLabel,
        options: [
          {
            type: "dropdown",
            id: "channel",
            label: "Channel",
            choices: aChoice,
            default: aChoice[0].id,
          },
        ],
        subscribe: (feedback) => {
          this.addWatchItem(aType, feedback.options.channel, feedback.id);
        },
        unsubscribe: (feedback) => {
          this.removeWatchItem(aType, feedback.options.channel, feedback.id);
        },
        callback: (feedback, bank) => {
          let opt = feedback.options;
          let watchlistitem = this.watchlist.get(
            this.buildWatchKey(aType, opt.channel)
          );
          if (
            watchlistitem !== undefined &&
            watchlistitem.args[1] !== undefined
          ) {
            //avoid polling timing hazard while waiting for first data returned from mixer
            if (bank.text != "") {
              return { text: bank.text + `\\n ${watchlistitem.args[1]}` };
            } else {
              return { text: bank.text + `${watchlistitem.args[1]}` };
            }
          }
        },
      };
    };

    const aSubscribeStateFeedback = (aType, aLabel, aChoice, fg, bg) => {
      return {
        type: "boolean",
        label: aLabel,
        description: "Show " + aLabel,
        options: [
          {
            type: "dropdown",
            id: "channel",
            label: "Channel",
            choices: aChoice,
            default: aChoice[0].id,
          },
        ],
        style: {
          color: fg,
          bgcolor: bg,
        },
        subscribe: (feedback) => {
          this.addWatchItem(aType, feedback.options.channel, feedback.id);
        },
        unsubscribe: (feedback) => {
          this.removeWatchItem(aType, feedback.options.channel, feedback.id);
        },
        callback: (feedback, bank) => {
          let opt = feedback.options;
          let watchlistitem = this.watchlist.get(
            this.buildWatchKey(aType, opt.channel)
          );
          if (
            watchlistitem !== undefined &&
            watchlistitem.args[1] !== undefined
          ) {
            //avoid polling timing hazard while waiting for first data returned from mixer
            if (watchlistitem.args[1] == "1") {
              return true;
            } else {
              return false;
            }
          }
        },
      };
    };

    this.SCOPE_MUTE.forEach((item) => {
      feedbacks[`${item.channel}_channel_mute`] = aSubscribeStateFeedback(
        "MU",
        `${item.channel.toUpperCase()} Channel Mute`,
        item.choices,
        this.rgb(255, 255, 255),
        this.rgb(255, 0, 0)
      );
    });
    this.SCOPE_MUTE_GROUP.forEach((item) => {
      feedbacks[`${item.channel}_channel_mute`] = aSubscribeStateFeedback(
        "MU",
        `${item.channel.toUpperCase()} Channel Mute`,
        item.choices,
        this.rgb(255, 255, 255),
        this.rgb(255, 0, 0)
      );
    });
    this.SCOPE_EQ.forEach((item) => {
      feedbacks[`${item.channel}_channel_eq`] = aSubscribeStateFeedback(
        "EQ",
        `${item.channel.toUpperCase()} Channel Eq`,
        item.choices,
        this.rgb(255, 255, 255),
        this.rgb(255, 170, 0)
      );
    });
    this.SCOPE_PHANTOM.forEach((item) => {
      feedbacks[
        `${item.channel}_channel_phantompower`
      ] = aSubscribeStateFeedback(
        "PT",
        `${item.channel.toUpperCase()} Channel Phantom Power`,
        item.choices,
        this.rgb(255, 255, 255),
        this.rgb(255, 170, 0)
      );
    });
    this.SCOPE_FADER.forEach((item) => {
      feedbacks[`${item.channel}_channel_level`] = aSubscribeLevelFeedback(
        "FD",
        `${item.channel.toUpperCase()} Channel Level`,
        item.choices
      );
    });
    this.setFeedbackDefinitions(feedbacks);
  }

  initPresets() {
    let presets = [];

    const aSwitchPreset = (aType, aScope, aChoice, fg, bg) => {
      return {
        category: aScope,
        label: aScope + " " + aType + " Button",
        bank: {
          style: "text",
          text: `$(${this.config.label}:name_${aChoice})`,
          size: "18",
          color: this.rgb(255, 255, 255),
          bgcolor: 0,
        },
        actions: [
          {
            action: aScope + "_channel_" + aType,
            options: {
              channel: aChoice,
              switch: "T",
            },
          },
        ],
        feedbacks: [
          {
            type: aScope + "_channel_" + aType,
            options: {
              channel: aChoice,
            },
            style: {
              color: fg,
              bgcolor: bg,
            },
          },
        ],
      };
    };
    const aSwitchLevelPreset = (aType, aScope, aChoice, fg, bg) => {
      return {
        category: aScope,
        label: aScope + " " + aType + " Button",
        bank: {
          style: "text",
          text: `$(${this.config.label}:name_${aChoice})`,
          size: "18",
          color: this.rgb(255, 255, 255),
          bgcolor: 0,
        },
        actions: [
          {
            action: aScope + "_channel_" + aType,
            options: {
              channel: aChoice,
              switch: "T",
            },
          },
        ],
        feedbacks: [
          {
            type: aScope + "_channel_" + aType,
            options: {
              channel: aChoice,
            },
            style: {
              color: fg,
              bgcolor: bg,
            },
          },
          {
            type: aScope + "_channel_level",
            options: {
              channel: aChoice,
            },
          },
        ],
      };
    };
    const aFaderPreset = (aType, aScope, aChoice, aMove, anIcon) => {
      return {
        category: aScope,
        label: aScope + " Faders",
        bank: {
          style: "png",
          text: "",
          png64: anIcon,
          size: "auto",
          color: this.rgb(255, 255, 255),
          bgcolor: 0,
        },
        actions: [
          {
            action: aScope + "_channel_" + aType,
            options: {
              channel: aChoice,
              level: aMove,
            },
          },
        ],
      };
    };

    this.SCOPE_MUTE.forEach((item) => {
      presets.push(
        aSwitchLevelPreset(
          "mute",
          item.channel,
          item.choices[0].id,
          this.rgb(255, 255, 255),
          this.rgb(255, 0, 0)
        )
      );
    });
    this.SCOPE_MUTE_GROUP.forEach((item) => {
      presets.push(
        aSwitchPreset(
          "mute",
          item.channel,
          item.choices[0].id,
          this.rgb(255, 255, 255),
          this.rgb(255, 0, 0)
        )
      );
    });
    this.SCOPE_FADER.forEach((item) => {
      presets.push(
        aFaderPreset(
          "relativefaderlevel",
          item.channel,
          item.choices[0].id,
          this.config.rf_increment.toString(),
          this.ICON_UP
        )
      );
      presets.push(
        aFaderPreset(
          "relativefaderlevel",
          item.channel,
          item.choices[0].id,
          -this.config.rf_increment.toString(),
          this.ICON_DOWN
        )
      );
    });
    this.setPresetDefinitions(presets);
  }
}

exports = module.exports = instance;
