package com.avid.central.samplugin.datamodel;

import javax.xml.bind.annotation.XmlElement;

/**
 * Created by Broadcast Media Solutions on 17/11/2015.
 */
public class SamResponse {
    @XmlElement(required = true)
    private String message;
    @XmlElement(required = true)
    private int result; // 0 = generic error, 1 = success, 2 = not authorized, 3 = configuration missing, 4 = configuration invalid, 5 = story locked

    public String getMessage() {
        return this.message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public int getResult() {
        return this.result;
    }

    public void setResult(int result) {
        this.result = result;
    }
}
