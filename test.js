const { MongoClient } = require('mongodb');

// Ganti dengan connection string Anda
const uri = "mongodb+srv://freelance_user:freelance123456@freelance.bvdcciz.mongodb.net/?appName=freelance";

const client = new MongoClient(uri);

async function run() {
  try {
    // Connect ke database
    await client.connect();
    console.log("✅ Berhasil terhubung ke MongoDB Atlas!");
    
    // Pilih database
    const database = client.db("freelance_db");
    
    // Buat collection
    const users = database.collection("users");
    
    // Insert test data
    const testUser = {
      name: "Test User",
      email: "test@example.com",
      role: "worker",
      createdAt: new Date()
    };
    
    const result = await users.insertOne(testUser);
    console.log("✅ Test data inserted:", result.insertedId);
    
    // Read test data
    const found = await users.findOne({ email: "test@example.com" });
    console.log("✅ Data ditemukan:", found);
    
    console.log("\n🎉 Database siap digunakan!");
    
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await client.close();
  }
}

run();