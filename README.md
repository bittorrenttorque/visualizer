#btapp_api_viewer
This api viewer is itself a web app using backbone.btapp.js... That library provides access to the state/functionality of uTorrent/BitTorrent clients either on the local machine or remotely. This viewer simply sits on top of the backbone library and displays the objects, with their attributes and functions that exist in the torrent client. 

As most apps that use backbone.btapp.js will simply use a subset of the data/functionality of the library, this should allow you to browse the possibilities.

As some of the data revealed is similar to the data that [docco](http://jashkenas.github.com/docco/ "docco") provides, and we use docco to provide annotated source code for all the btapp libraries and examples, the design of this app largely mirrors docco output. Thanks to Jeremy Ashkenas!

__Dependencies:__  
[backbone.btapp.js](http://pwmckenna.github.com/btapp "btapp")  
[plugin.btapp.js](http://pwmckenna.github.com/plugin "plugin")  
  
  
#Authors

Patrick Williams  
http://github.com/pwmckenna
  
Kyle Graehl  
https://github.com/kzahel
  
  
#License
  
Copyright 2012 BitTorrent, Inc.  
Licensed under the Apache License, Version 2.0: http://www.apache.org/licenses/LICENSE-2.0
