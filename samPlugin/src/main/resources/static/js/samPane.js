AV.ViewManager.addViewFactory('samPane', function() {
    return new AV.View({
        onInit: function() {
            // Add the iframe

//            this.dom().html('<iframe width="100%" height="100%" id="myFrame" src;
            this.dom().append("<link rel=\"stylesheet\" href=\"fonts/lato/fonts.css\">");
            this.dom().append("<link rel=\"stylesheet\" href=\"css/bootstrap.min.css\">");
            this.dom().append("<link rel=\"stylesheet\" href=\"css/vendor/bootstrap-editable.css\">");
            this.dom().append("<link rel=\"stylesheet\" href=\"css/vendor/speechBubble.css\">");
            this.dom().append("<link rel=\"stylesheet\" href=\"css/vendor/offcanvas.css\">");
            this.dom().append("<link rel=\"stylesheet\" href=\"css/vendor/dataTables.colReorder.min.css\">");
            this.dom().append("<link rel=\"stylesheet\" href=\"css/qtube.css\">");
            this.dom().append("<link rel=\"stylesheet\" href=\"css/qtubejw.css\">");
            this.dom().append("<link rel=\"stylesheet\" href=\"css/styles.css\">");

            this.dom().append("<div>Mike was here!</div>");
            this.dom().append("<div id=\"loggingIn\" class=\"loader player-loader hide\"></div>");
            //this.dom().append("<div id=\"base\"><noscript>Please enable javascript in you browser settings to continue</noscript></div>");
            this.dom().append("<div id=\"base\"></div>");
            this.dom().append("<div id=\"afp\"><button id=\"playClip\">Play something</button></div>");
            this.dom().append("<script data-main=\"app-avid\" src=\"vendor/require.js\"></script>");

/*
            var script = document.createElement( 'script' );
            script.data-main = 'app-avid';
            script.src = 'vendor/require.js';
            this.dom().append( script );
*/
        }


    })

    function load_home(){
    var data = "<!doctype html>" +
        "<html lang=\"en\">" +
            "<head>" +
            "<meta charset=\"utf-8\">" +
            "<meta name=\"viewport\" content=\"width=device-width\">" +
            "<title>HTML5 Player Framework</title>" +
            "</head>" +
            "<body>" +
            "<h1>HTML5 Player Framework</h1>" +
        "<h2>Examples</h2>" +
        "<ul>" +
        "<li><a href=\"html/declarative.html\">Declarative Usage</a></li>" +
        "<li><a href=\"html/javascript.html\">JavaScript Usage</a></li>" +
        "<li><a href=\"html/fallback.html\">Fallback Usage</a></li>" +
        "<li><a href=\"html/advancedfallbacks.html\">Advanced Fallbacks</a></li>" +
        "<li><a href=\"html/playlist.html\">Playlist</a></li>" +
            "<li><a href=\"html/mediarssplaylist.html\">Media RSS Playlist</a></li>" +
        "<li><a href=\"html/captions.html\">Closed Captions</a></li>" +
        "<li><a href=\"html/cues.html\">Timeline and Chapter Cues</a></li>" +
        "<li><a href=\"html/autoplay.html\">Autoplay</a></li>" +
            "<li><a href=\"html/accessibility.html\">Accessibility</a></li>" +
            "<li><a href=\"html/localization.html\">Localization</a></li>" +
            "</ul>" +
            "<h2>Resources</h2>" +
            "<ul>" +
            "<li><a href=\"http://playerframework.codeplex.com/releases/view/86402\" target=\"_blank\">HTML5 Player Framework 1.1 (CodePlex)</a></li>" +
        "<li><a href=\"http://playerframework.codeplex.com/wikipage?title=Player%20Framework%20for%20HTML5\" target=\"_blank\">HTML5 Player Framework Documentation (CodePlex)</a></li>" +
        "<li><a href=\"http://playerframework.codeplex.com/\" target=\"_blank\">Player Framework (CodePlex)</a></li>" +
        "<li><a href=\"http://www.microsoft.com/en-us/mediaplatform/\" target=\"_blank\">Microsoft Media Platform</a></li>" +
        "</ul>" +
        "</body>" +
        "</html>"
       return data;
    }
});
