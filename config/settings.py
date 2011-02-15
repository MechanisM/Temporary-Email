# This file contains python variables that configure Lamson for email processing.
import logging

# You may add additional parameters such as `username' and `password' if your
# relay server requires authentication, `starttls' (boolean) or `ssl' (boolean)
# for secure connections.
relay_config = {'host': 'localhost', 'port': 825}

receiver_config = {'host': '', 'port': 25}

handlers = ['app.handlers.to_redis']

router_defaults = {'host': 'm.tutamc.com'}

template_config = {'dir': 'app', 'module': 'templates'}

# the config/boot.py will turn these values into variables set in settings
