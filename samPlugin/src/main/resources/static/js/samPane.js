AV.ViewManager.addViewFactory('samPane', function() {
    return new AV.View({
        onInit: function() {
            this.bindGlobal("open", function (event, data) {
                playClip(data);
            });
                // Add the iframe
            this.dom().html('<iframe width="100%" height="100%" src="http://localhost:61864/player.aspx" frameborder="0"></iframe>');
             /*
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
            */

        }
    })

    function playClip (clipData)
    {

    }

});
