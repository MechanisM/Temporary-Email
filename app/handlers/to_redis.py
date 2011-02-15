import re
import json
import time

import redis
from lamson.routing import route, stateless

import logging

class Transform(object):
    """Abstraction for a regular expression transform.

    Transform subclasses have two properties:
       regexp: the regular expression defining what will be replaced
       replace(MatchObject): returns a string replacement for a regexp match

    We iterate over all matches for that regular expression, calling replace()
    on the match to determine what text should replace the matched text.

    The Transform class is more expressive than regular expression replacement
    because the replace() method can execute arbitrary code to, e.g., look
    up a WikiWord to see if the page exists before determining if the WikiWord
    should be a link.
    """

    def run(self, content):
        """Runs this transform over the given content.

        Args:
          content: The string data to apply a transformation to.

        Returns:
          A new string that is the result of this transform.
        """
        parts = []
        offset = 0
        for match in self.regexp.finditer(content):
            parts.append(content[offset:match.start(0)])
            parts.append(self.replace(match))
            offset = match.end(0)
        parts.append(content[offset:])
        return ''.join(parts)


class AutoLink(Transform):
    """A transform that auto-links URLs."""

    def __init__(self):
        self.regexp = re.compile(r'([^"])\b((http|https)://[^ \t\n\r<>\(\)&"]+'\
                                 r'[^ \t\n\r<>\(\)&"\.])')

    def replace(self, match):
        url = match.group(2)
        return match.group(1) + '<a target="_blank" href="%s">%s</a>' % (url, url)


@route("(to)@(host)", to=".+", host=".+")
@stateless
def START(message, to=None, host=None):
    if not host == "m.tutamc.com":
        return

    if message.base.content_encoding['Content-Type'][0] == 'text/plain':
        mess = AutoLink().run(message.body())
        mess = mess.replace("\n", "<br>")
    else:
        mess = message.body()

    r = redis.Redis()
    r.publish("new_email", json.dumps({
        "to": "%s@%s" % (to, host),
        "from": message["from"],
        "subject": message["subject"],
        "body": mess,
        "created": time.time()
    }))