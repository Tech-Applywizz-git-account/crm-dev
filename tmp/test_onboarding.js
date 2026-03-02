const https = require('https');

const data = JSON.stringify({
    email: "test_assistant@applywizz.com",
    resume_s3_path: "resumes/test_assistant_resume.pdf",
    submission_type: "pending",
    is_new_domain: true,
    full_name: "Assistant Test",
    personal_email: "assistant_test@example.com",
    applywizz_id: "test-lead-guid",
    phone: "+1234567890",
    experience: "1",
    gender: "Male",
    state_of_residence: "California",
    zip_or_country: "90210",
    start_date: "2026-03-01",
    job_role_preferences: ["Software Engineer"],
    visa_type: "H1B",
    location_preferences: ["Remote"]
});

const options = {
    hostname: 'apply-wizz.me',
    port: 443,
    path: '/api/direct-onboard',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = https.request(options, (res) => {
    let responseBody = '';
    res.on('data', (d) => {
        responseBody += d;
    });
    res.on('end', () => {
        console.log('Status Code:', res.statusCode);
        console.log('Response Body:', responseBody);
    });
});

req.on('error', (error) => {
    console.error(error);
});

req.write(data);
req.end();
