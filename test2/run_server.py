import os
from http.server import SimpleHTTPRequestHandler, HTTPServer

PORT = 8000

class CustomHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        # Log the request
        print(f"Request: {self.path}")
        
        # Redirect root to /test.html
        if self.path == '/':
            self.path = '/test.html'

        # Set explicit MIME types for key files
        if self.path.endswith('.js'):
            self.send_header('Content-Type', 'application/javascript')
        elif self.path.endswith('.html'):
            self.send_header('Content-Type', 'text/html')
        elif self.path.endswith('.geojson'):
            self.send_header('Content-Type', 'application/geo+json')

        try:
            return super().do_GET()
        except FileNotFoundError:
            self.send_error(404, f"File not found: {self.path}")

    def end_headers(self):
        # Add basic CORS headers for service worker compatibility
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()

if __name__ == '__main__':
    # Ensure we're in the right directory (e.g., where test.html, sw2.js, etc., live)
    script_dir = os.path.dirname(__file__)
    os.chdir(script_dir)
    print(f"Working directory set to: {os.getcwd()}")

    # List files to confirm they're accessible
    print("Available files:", os.listdir(script_dir))

    server_address = ('', PORT)
    httpd = HTTPServer(server_address, CustomHandler)
    print(f"Serving HTTP on port {PORT} ...")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped by user.")
        httpd.server_close()