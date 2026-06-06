// Fixed Student Creation with Automatic Login Account Creation
// This code should replace the problematic section in students.js

// Add this after the student_membership_history insertion and before COMMIT:

// Automatically create student login account if owner is creating the student
try {
  // Check if this is an owner session (check both req.session.owner and req.session.user with isOwner flag)
  let libraryId = null;
  
  if (req.session.owner) {
    libraryId = req.session.owner.id;
    console.log(`[STUDENTS] Owner session detected - library_id: ${libraryId}`);
  } else if (req.session.user && req.session.user.isOwner && req.session.user.libraryId) {
    libraryId = req.session.user.libraryId;
    console.log(`[STUDENTS] Owner user session detected - library_id: ${libraryId}`);
  }
  
  if (libraryId && phone) {
    console.log(`[STUDENTS] Owner creating student - auto-creating login account for: ${name}, phone: ${phone}, library_id: ${libraryId}`);
    
    // Check if student account already exists
    const existingAccount = await client.query(
      'SELECT id FROM student_accounts WHERE phone = $1 AND library_id = $2',
      [phone, libraryId]
    );
    
    if (existingAccount.rows.length === 0) {
      await client.query(`
        INSERT INTO student_accounts (library_id, phone, password, student_id, name, email, registration_number)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        libraryId,
        phone,
        phone, // Password is same as phone number
        student.id,
        name,
        email,
        registration_number
      ]);
      
      console.log(`[STUDENTS] Successfully auto-created login account for student: ${name}`);
    } else {
      console.log(`[STUDENTS] Login account already exists for phone: ${phone}`);
    }
  } else {
    console.log(`[STUDENTS] Not an owner session or missing phone - libraryId: ${libraryId}, phone: ${phone}`);
  }
} catch (accountError) {
  console.error('[STUDENTS] Error auto-creating student account:', accountError);
  // Don't fail the student creation if account creation fails
}
