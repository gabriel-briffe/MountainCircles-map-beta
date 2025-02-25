import os
from http.server import SimpleHTTPRequestHandler, HTTPServer

# Define the port where you want the server to run
PORT = 8000

class CustomHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        # If the root path is requested, serve test.html.
        if self.path == '/':
            self.path = '/test.html'
        return super().do_GET()

if __name__ == '__main__':
    # Since all the files are in /test2, set the working directory to the current directory.
    os.chdir(os.path.dirname(__file__))
    
    server_address = ('', PORT)
    httpd = HTTPServer(server_address, CustomHandler)
    print(f"Serving HTTP on port {PORT} ...")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped by user.")
        httpd.server_close()
