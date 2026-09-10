#!/usr/bin/env python3
"""Serve the embed/ widgets on this computer only (port 43141)."""
from __future__ import print_function

import os
import sys
import threading
from functools import partial

try:
    from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
except ImportError:
    print("This needs Python 3.7 or newer.")
    sys.exit(1)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EMBED = os.path.join(ROOT, "embed")
PORT = 43141


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, fmt, *args):
        sys.stdout.write("%s - %s\n" % (self.address_string(), fmt % args))
        sys.stdout.flush()


def make_server(host):
    handler = partial(QuietHandler, directory=EMBED)
    httpd = ThreadingHTTPServer((host, PORT), handler)
    return httpd


def main():
    if not os.path.isdir(EMBED):
        print("Could not find the embed folder next to scripts/.")
        print("Open the unzipped folder so you can see Mac, Windows, and Linux, then start again.")
        sys.exit(1)

    ipv4 = None
    try:
        ipv4 = make_server("127.0.0.1")
    except OSError as err:
        print("Port %s is already in use, or could not be opened (%s)." % (PORT, err))
        print("Use the Stop file in the Mac, Windows, or Linux folder, then start again.")
        sys.exit(1)

    def serve_ipv6():
        try:
            httpd6 = make_server("::1")
        except OSError:
            return
        try:
            httpd6.serve_forever()
        except OSError:
            return

    threading.Thread(target=serve_ipv6, daemon=True).start()

    print("")
    print("Ready. Leave this window open.")
    print("Open one of these (same calculators):")
    print("  http://localhost:%s/preview.html" % PORT)
    print("  http://127.0.0.1:%s/preview.html" % PORT)
    print("If one does not load, try the other.")
    print("Press Ctrl+C here to stop, or use the Stop file in your computer's folder.")
    print("")
    sys.stdout.flush()
    try:
        ipv4.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")
        ipv4.shutdown()


if __name__ == "__main__":
    main()
