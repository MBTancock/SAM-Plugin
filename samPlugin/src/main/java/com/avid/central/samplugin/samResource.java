package com.avid.central.samplugin;

import javax.ws.rs.*;
import java.util.*;

import com.avid.central.samplugin.datamodel.SamRequest;
import com.avid.central.samplugin.datamodel.*;

import java.util.UUID;

/**
 * Created by Broadcast Media Solutions on 11/03/2016.
 */

@Path("/sam")
@Consumes("application/json")
@Produces("application/json")

public class samResource {
    @GET
    @Path("/{id}")
    public SamResponse get(@PathParam("id") UUID id) {

        SamResponse response = new SamResponse();

        return response;
    }
}
