import * as vscode from "vscode";
import { play, pause, next, previous } from "./extension";

export class SidebarProvider implements vscode.WebviewViewProvider {
  _view?: vscode.WebviewView;
  _doc?: vscode.TextDocument;

  constructor(private readonly _extensionUri: vscode.Uri) {}

  public resolveWebviewView(webviewView: vscode.WebviewView) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri]
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(async (mData) => {
      switch (mData.type) {
        case "onPlay": {
          play();
          break;
        }
        case "onPause": {
          pause();
          break;
        }
        case "onNextSong": {
          next();
          break;
        }
        case "onPreviousSong": {
          previous();
          break;
        }
      }
    });
  }

  public revive(panel: vscode.WebviewView) {
    this._view = panel;
  }

  private _getHtmlForWebview(webview: vscode.Webview) {

    const stylesResetUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "styles", "reset.css")
    );
    const stylesMainUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "styles", "vscode.css")
    );
    const stylesCustomUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "styles", "custom.css")
    );

    return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
        <meta http-equiv="Content-Security-Policy" content="img-src https: data:; 'unsafe-inline'>
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<link href="${stylesResetUri}" rel="stylesheet">
        <link href="${stylesMainUri}" rel="stylesheet">
        <link href="${stylesCustomUri}" rel="stylesheet">
			</head>
      <body>
      <h1>Project Arctia (Alpha)</h1>
      <br>
      <a class="album-link">
        <img class="album-artwork" width="1000" height="1000">
      </a>
      <h2 class="name"> </h2>
      <h3 class="artist"> </h3>
      <p class="album"> </p>
      <br>
      <input class="playback-slider" type="range" id="volume" min="0" oninput="seekTo(playbackSlider.value);">
      <div class="playback-buttons">
        <button class="playback-button play" onclick="postMessage('onPlay')">Play</button>
        <button class="playback-button pause" onclick="postMessage('onPause')">Pause</button>
        <button class="playback-button next" onclick="postMessage('onNextSong')">Next Song</button>
        <button class="playback-button previous" onclick="postMessage('onPreviousSong')">Previous Song</button>
      </div>
      <div class="debug">
        <h3>Debug</h3>
        <button class="playback-button" onclick="console.log(currentMediaItem)">Log Playback Info</button>
      </div>
      <div class="footer">
        <p class="radio-notice">Playback controls are currently not supported during radio playback.</p>
        <br>
        <footer>Made with <button class="heart" onclick="heartTap()">❤️</button> by <a href="https://github.com/Amaru8/" target="_blank">Amaru#0989</a></footer>
      </div>
      <script>
        const tsvscode = acquireVsCodeApi();
        let artworkElement = document.querySelector(".album-artwork");
        let albumLinkElement = document.querySelector(".album-link");
        let nameElement = document.querySelector(".name");
        let artistElement = document.querySelector(".artist");
        let albumElement = document.querySelector(".album");
        let playbackSlider = document.querySelector(".playback-slider");
        let playButton = document.querySelector(".play");
        let pauseButton = document.querySelector(".pause");
        let nextButton = document.querySelector(".next");
        let previousButton = document.querySelector(".previous");
        let debugElements = document.querySelector(".debug");
        let radioNoticeElement = document.querySelector(".radio-notice");
        let heartBeat = 0;
        let currentMediaItem = {};

        function postMessage(type, value = '') { tsvscode.postMessage({ type: type, value: value }); }

        function seekTo(time, adjust = true) {
          if (adjust) { time = parseInt(time / 1000) }
          socket.send(JSON.stringify({ action: "seek", time: time }));
        }

        function heartTap() {
          heartBeat += 1;
          switch (heartBeat) {
            case 3:
              debugElements.style.display = "block";
              break;
            case 6:
              debugElements.style.display = "none";
              heartBeat = 0;
              break;
          }
        }
        
        socket = new WebSocket("ws://localhost:26369");
        socket.onopen = (e) => {
          socket.onmessage = (e) => {
            currentMediaItem = JSON.parse(e.data).data;
            console.log(currentMediaItem);
            // Playback Info
            if (currentMediaItem.name && nameElement.innerText !== currentMediaItem.name) {
              nameElement.innerText = currentMediaItem.name;
            }
            if (currentMediaItem.playParams && currentMediaItem.playParams.kind == "song") {
              if (currentMediaItem.artistName && artistElement.innerText !== currentMediaItem.artistName) {
                artistElement.innerText = currentMediaItem.artistName;
              }
              if (currentMediaItem.albumName && albumElement.innerText !== currentMediaItem.albumName) {
                albumElement.innerText = currentMediaItem.albumName;
              }
            } else if (currentMediaItem.playParams && currentMediaItem.playParams.kind == "radioStation") {
              albumElement.innerText = "";
              artistElement.innerText = "Radio Station";
            } else {
              albumElement.innerText = "";
              artistElement.innerText = "";
            }
              
            // Album Artwork
            if (currentMediaItem.artwork && currentMediaItem.artwork.url.length > 0) {
              artworkElement.src = currentMediaItem.artwork.url.replace('{w}', 600).replace('{h}', 600);
            }
            if (currentMediaItem.playParams && currentMediaItem.playParams.kind == "song") {
              if (currentMediaItem.url && currentMediaItem.url.appleMusic.length > 0) {
                albumLinkElement.href = currentMediaItem.url.appleMusic;
              }
            } else {
              albumLinkElement.href = "";
            }

            // Radio Notice
            if (currentMediaItem.playParams && currentMediaItem.playParams.kind == "radioStation") {
              radioNoticeElement.style.display = "block";
            } else {
              radioNoticeElement.style.display = "none";
            }

            // Play/Pause Logic
            if (currentMediaItem.playParams && currentMediaItem.playParams.kind == "song") {
              if (currentMediaItem.status !== undefined) {
                if (currentMediaItem.status == true) {
                  playButton.style.display = "none";
                  pauseButton.style.display = "inline-block";
                } else {
                  pauseButton.style.display = "none";
                  playButton.style.display = "inline-block";
                }
              }
            } else {
              playButton.style.display = "none";
              pauseButton.style.display = "none";
            }

            // Next/Previous Logic
            if (currentMediaItem.playParams && currentMediaItem.playParams.kind == "song") {
              if (currentMediaItem.status !== undefined) {
                nextButton.style.display = "inline-block";
                previousButton.style.display = "inline-block";
              }
            } else {
              nextButton.style.display = "none";
              previousButton.style.display = "none";
            }

            // Playback Slider
            if (currentMediaItem.playParams && currentMediaItem.playParams.kind == "song") {
              if (playbackSlider.max == null) {
                playbackSlider.style.display = "none";
              }
              if (currentMediaItem.durationInMillis) {
                if (playbackSlider.style.display == "none") {
                  playbackSlider.style.display = "block";
                }
                playbackSlider.max = currentMediaItem.durationInMillis;
              }
              if (currentMediaItem.remainingTime && currentMediaItem.durationInMillis) {
                if (playbackSlider.style.display == "none") {
                  playbackSlider.style.display = "block";
                }
                playbackSlider.value = currentMediaItem.durationInMillis - currentMediaItem.remainingTime;
              }
            } else {
              playbackSlider.style.display = "none";
            }   
          }
        }

      </script>
			</body>
			</html>`;
  }
}
