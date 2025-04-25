plugin_paths = {
  "/var/www/planetube-latest/test-plugins/peertube-plugin-planetubelivechat/prosody-modules"
}

modules_enabled = {
  "websocket";
  "bosh";
  -- other required modules
}

http_paths = {
  xmpp_websocket = "/plugins/planetubelivechat/12.0.3/ws/xmpp-websocket"
}

-- Make sure the data persists
data_path = "/var/www/planetube-latest/test-plugins/peertube-plugin-planetubelivechat/data/prosody"
