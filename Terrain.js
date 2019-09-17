/**
* Contain two functions to create terrain with various height
*/

/**
* The overall terrian formation function, to fill up each buffer
* return the number of triangles
*/
function terrianFormation(div, minX, maxX, minY, maxY, vBuffer, fBuffer, nBuffer, eBuffer){
    var deltaX = (maxX-minX)/div;
    var deltaY = (maxY-minY)/div;
    
    //First push x, y, z into vertex Buffer
    for(var i = 0; i <= div; i++){
        for(var j = 0; j <= div; j++){  
            vBuffer.push(minX+j*deltaX); 
            vBuffer.push(minY+i*deltaY);
            vBuffer.push(0);
        }
    }
    
    //Generate terrain with height using the Terrain Generate class
    var terrain = new TerrainGenerate(div+1, 0.3);
    terrain.diamondSquare();
    
    //Set all the z values in the vertex Buffer
    for(var i = 0; i <= div; i++){
        for(var j = 0; j <= div; j++){
            vBuffer[3*(i*(div+1)+j)+2] = 0.03 * terrain.getZValue(i, j);
        }
    }
    
    //Count the number of triangles
    var numT = 0;
    
    //Push triangles into face buffer
    for(var i = 0; i < div; i++){
        for(var j = 0; j < div; j++){
            var idx = i*(div+1)+j;
            
            //first triange
            fBuffer.push(idx);
            fBuffer.push(idx+1);
            //access the third point
            fBuffer.push(idx+div+1);
            
            //Second triange
            fBuffer.push(idx+1);
            fBuffer.push(idx+div+1);
            fBuffer.push(idx+div+2);
            numT += 2;
        }
    }
    
    //Push normal into normal buffer
    for(var i = 0; i <= div; i++){
        for(var j = 0; j <= div; j++){
            //Three vertex for each face
            var vertex1 = vec3.fromValues(vBuffer[3*(i*(div+1)+j)], vBuffer[3*(i*(div+1)+j)+1], vBuffer[3*(i*(div+1)+j)+2]);
            var vertex2 = vec3.fromValues(vBuffer[3*((i+1)*(div+1)+j)], vBuffer[3*((i+1)*(div+1)+j)+1], vBuffer[3*((i+1)*(div+1)+j)+2]);
            var vertex3 = vec3.fromValues(vBuffer[3*(i*(div+1)+j+1)], vBuffer[3*(i*(div+1)+j+1)+1], vBuffer[3*(i*(div+1)+j+1)+2]);
               
            //declare edge and normal vector
            var edge1 = vec3.create();
            var edge2 = vec3.create();
            var normal = vec3.create();
               
            //Calculate edges, and get normal
            vec3.subtract(edge1, vertex1, vertex2);
            vec3.subtract(edge2, vertex3, vertex2);
            vec3.cross(normal, edge1, edge2);
            vec3.normalize(normal, normal);
               
            //push normal value to nBuffer
            nBuffer.push(normal[0]);
            nBuffer.push(normal[1]);
            nBuffer.push(normal[2]);
        }
    }
    return numT;
    
}

/**
    * Generates line values from faces in faceArray
    * to enable wireframe rendering. For checking purpose
    */
function generateLines(fBuffer, eBuffer){
        var numTris=fBuffer.length/3;
        for(var f=0;f<numTris;f++){
            var fid=f*3;
            eBuffer.push(fBuffer[fid]);
            eBuffer.push(fBuffer[fid+1]);
        
            eBuffer.push(fBuffer[fid+1]);
            eBuffer.push(fBuffer[fid+2]);
        
            eBuffer.push(fBuffer[fid+2]);
            eBuffer.push(fBuffer[fid]);
        }
    
}

