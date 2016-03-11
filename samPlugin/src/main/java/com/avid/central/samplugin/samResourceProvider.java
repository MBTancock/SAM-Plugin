package com.avid.central.samplugin;

import com.avid.central.services.rest.resource.provider.SingletonsProvider;
import org.apache.felix.scr.annotations.Activate;
import org.apache.felix.scr.annotations.Component;
import org.apache.felix.scr.annotations.Deactivate;
import org.apache.felix.scr.annotations.Service;

import java.util.Collections;
import java.util.Set;

/**
 * Created by Broadcast Media Solutions on 11/03/2016.
 */

@Component(name = "samResourceProvider", immediate = true)
@Service(SingletonsProvider.class)
public class samResourceProvider implements SingletonsProvider {
    private samResource _samResource;

    @Activate
    public void activate () {
        _samResource = new samResource();
    }

    @Deactivate
    public void deactivate () {
        _samResource = null;
    }

    @Override
    public Set<?> getSingletons() {
        return Collections.singleton(_samResource);
    }
}
