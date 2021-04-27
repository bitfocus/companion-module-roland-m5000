# companion-module-roland-m5000
See HELP.md and LICENSE

The M-5000 mixer uses an ethernet connection for control but this just uses the serial protocol over ip
The older mixers have a seial connection (M-2xx, M-3xx, M-4xx) and the protocol is the same
Channels types, counts and functions vary by model and there is a json file with basic detauils and the initialisation of the module creates the correct actions etc.

To attach to a serial mixer the module needs to be used with a serial bridge. This module has been tested with the TCP-Serial module and the VMXProxy open source bridge (on GitHub). 
The latter was built for an android application but also works with this module and has a useful simulator for testing.

Commands are \<stx\>**C:args;   -   where ** is a function code
The VMXProxy server is protocol aware and always returns complete responses (which are either \<ack\> for a success, \<stx\>ERR:errcode; for an error, or, \<stx\>**S:args; for a response)
Multiple messages are possible in one response in response to a rapid stream of commands.
the TCP-Serial companion module will return whatever it has in the buffer so it can send back partial responses. The TCP handling code in the module allows for this by buffering partial responses.

As serial mixers have a limited bandwidth connection the module only asks for what it needs - channel names at start-up (they don't chnage much) and status and levels as needed for the button configuration. These are polled on a timer.