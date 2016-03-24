AV.ViewManager.addViewFactory('samPane', function() {
    return new AV.View({
        onInit: function() {
            this.bindGlobal("open", function (event, data) {
                playClip(data);
            });

            this.dom().append(buildDom());

                // Add the iframe
//            this.dom().html('<iframe width="100%" height="100%" src="http://localhost:61864/player.aspx" frameborder="0"></iframe>');

            //this.dom().append("<div id=\"silverlightControlHost\"></div>");
            //var myDiv = $('#myDiv');
            //this.dom().append("<div id=\"testDiv\">Fred was here!</div>");

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

            this.dom().append("<div id=\"loggingIn\" class=\"loader player-loader hide\"></div>");
            //this.dom().append("<div id=\"base\"><noscript>Please enable javascript in you browser settings to continue</noscript></div>");
            this.dom().append("<div id=\"base\"></div>");
            this.dom().append("<div id=\"afp\"><button id=\"playClip\">Play something</button></div>");
            this.dom().append("<script src=\"vendor/bootstrap.min.js\"></script>");
            this.dom().append("<script src=\"vendor/jquery-1.11.1.min.js\"></script>");
            this.dom().append("<script src=\"vendor/jquery-ui.min.js\"></script>");
            this.dom().append("<script src=\"vendor/jquery.dataTables-1.10.5.min.js\"></script>");
            this.dom().append("<script src=\"vendor/dataTables.colReorder.min.js\"></script>");
            this.dom().append("<script src=\"vendor/jquery.fullscreen.min.js\"></script>");
            this.dom().append("<script src=\"vendor/bootstrap-editable.min.js\"></script>");
            this.dom().append("<script src=\"vendor/media-source-portability.js\"></script>");
*/


        }
    })

    function buildDom()
    {
        var msg = "<div id=\"silverlightControlHost\">";
        msg += "<object data=\"data:application/x-silverlight-2,\" type=\"application/x-silverlight-2\" width=\"100%\" height=\"100%\">";
        msg += "<param name=\"source\" value=\"js/SmoothStreamingPlayer.js\"/>";
        msg += "<param name=\"onError\" value=\"onSilverlightError\" />";
        msg += "<param name=\"background\" value=\"white\" />";
        msg += "<param name=\"minRuntimeVersion\" value=\"4.0.50401.0\" />";
        msg += "<param name=\"autoUpgrade\" value=\"true\" />";
        msg += "<param name=\"InitParams\" value=\"mediaurl=http://195.12.20.58:8090/quantel/homezone/clips/streams/229045/stream.xml\" />";
        msg += "<a href=\"http://go.microsoft.com/fwlink/?LinkID=149156&v=4.0.50401.0\" style=\"text-decoration:none\">";
        msg += "<img src=\"http://go.microsoft.com/fwlink/?LinkId=161376\" alt=\"Get Microsoft Silverlight\" style=\"border-style:none\"/>";
        msg += "</a>";
        msg += "</object>";
        return msg;
    }
    function playClip (clipData)
    {

    }

    function onSilverlightError(sender, args) {
        var appSource = "";
        if (sender != null && sender != 0) {
            appSource = sender.getHost().Source;
        }

        var errorType = args.ErrorType;
        var iErrorCode = args.ErrorCode;

        if (errorType == "ImageError" || errorType == "MediaError") {
            return;
        }

        var errMsg = "Unhandled Error in Silverlight Application " +  appSource + "\n" ;

        errMsg += "Code: "+ iErrorCode + "    \n";
        errMsg += "Category: " + errorType + "       \n";
        errMsg += "Message: " + args.ErrorMessage + "     \n";

        if (errorType == "ParserError") {
            errMsg += "File: " + args.xamlFile + "     \n";
            errMsg += "Line: " + args.lineNumber + "     \n";
            errMsg += "Position: " + args.charPosition + "     \n";
        }
        else if (errorType == "RuntimeError") {
            if (args.lineNumber != 0) {
                errMsg += "Line: " + args.lineNumber + "     \n";
                errMsg += "Position: " +  args.charPosition + "     \n";
            }
            errMsg += "MethodName: " + args.methodName + "     \n";
        }

        throw new Error(errMsg);
    }
});
