import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
admin.initializeApp();
const db = admin.firestore();

const { sid, auth_token } = functions.config().twilio;
import * as twilio from 'twilio';

const robocaller = twilio(sid, auth_token);


// Optional interface, all worker functions should return Promise. 
interface Workers {
    [key: string]: (options: any) => Promise<any>
}

// Business logic for named tasks. Function name should match worker field on task document. 
const workers: Workers = {
    helloWorld: () => db.collection('logs').add({ hello: 'world' }),

    makeCall: async ({ phoneNumber }) => {
        const call = await robocaller.calls.create({
            to: phoneNumber,
            from: '+1........',
            url: 'https://lessonapp.page.link/nM9x',
            method: 'GET'
          });
      
          console.log(call.toJSON());
      
          return call.sid;
    }
}


export const taskRunner = functions.runWith( { memory: '2GB' }).pubsub

    .schedule('* * * * *').onRun(async context => {

        // Consistent timestamp
        const now = admin.firestore.Timestamp.now();
        
        // Query all documents ready to perform
        const query = db.collection('tasks').where('performAt', '<=', now).where('status', '==', 'scheduled');

        const tasks = await query.get();


        // Jobs to execute concurrently. 
        const jobs: Promise<any>[] = [];

        // Loop over documents and push job.
        tasks.forEach(snapshot => {
            const { worker, options } = snapshot.data();

            const job = workers[worker](options)
                
                // Update doc with status on success or error
                .then(() => snapshot.ref.update({ status: 'complete' }))
                .catch((err) => snapshot.ref.update({ status: 'error' }));

            jobs.push(job);
        });

        // Execute all jobs concurrently
        return await Promise.all(jobs);

});


// export const dailyJob = functions.pubsub

//     .schedule('30 5 * * *').onRun(context => {
//         console.log('This will be run every day at 5:30AM');
//     });

// export const breans = functions.pubsub
//     .schedule('every 5 minutes').onRun(context => {
//          console.log('This will be run every 5 minutes!');  
//     });