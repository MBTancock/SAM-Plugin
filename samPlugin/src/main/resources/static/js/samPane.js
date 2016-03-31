AV.ViewManager.addViewFactory('samPane', function() {
    return new AV.View({
        onInit: function() {
            this.bindGlobal("open", function (event, data) {
                playClip(data);
            });

            rootElement = this.dom();
            //rootElement.append(buildDom());
                // Add the iframe
            //this.dom().html('<iframe width="100%" height="100%" src="https://192.168.0.122/" frameborder="0"></iframe>');
        }
    })

    var rootElement;

    function buildDom(id)
    {
        var msg = "<style type=\"text/css\">html, body {height: 100%;overflow: auto;} body {padding: 0;margin: 0;}\#silverlightControlHost {height: 100%;text-align:center}</style>";
        //msg += "<form id=\"form1\" runat=\"server\" style=\"height:100%\">";
        msg += "<div id=\"silverlightControlHost\">";
        msg += "<object id=\"player\" data=\"data:application/x-silverlight-2,\" type=\"application/x-silverlight-2\" width=\"100%\" height=\"100%\">";
        msg += "<param name=\"source\" value=\"/com.broadcastmediasolutions.samPlugin/0.0.1.EVALUATE/js/SmoothStreamingPlayer.js\"/>";
        msg += "<param name=\"onError\" value=\"onSilverlightError\" />";
        msg += "<param name=\"background\" value=\"black\" />";
        msg += "<param name=\"minRuntimeVersion\" value=\"5.0.61118.0\" />";
        msg += "<param name=\"autoUpgrade\" value=\"true\" />";
        msg += "<param name=\"InitParams\" value=\"mediaurl=http://195.12.20.58:8090/quantel/homezone/clips/streams/";
        msg += id;
        msg += "/stream.xml\" />";
        msg += "<a href=\"http://go.microsoft.com/fwlink/?LinkID=149156&v=4.0.50401.0\" style=\"text-decoration:none\">";
        msg += "<img src=\"http://go.microsoft.com/fwlink/?LinkId=161376\" alt=\"Get Microsoft Silverlight\" style=\"border-style:none\"/>";
        msg += "</a>";
        msg += "</object>";
        msg += "</div>"
        //msg += "</form>"
        return msg;
    }


    function playClip (clipData)
    {
        if (clipData.commonObject.base.systemType != "samClipBrowser")
        {
            return;
        }

        rootElement.children().remove();
        rootElement.append(buildDom(clipData.commonObject.base.id));
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
