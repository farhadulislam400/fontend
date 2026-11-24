// Blood Donation Finder (C++ Console Application)
// -------------------------------------------------
// Save this file as: blood_donation_finder.cpp
// Compile: g++ -std=c++17 blood_donation_finder.cpp -o blood_app
// Run:     ./blood_app  (on Windows: blood_app.exe)
//
// Note: We use a very simple CSV file "donors.csv" for storage.
// Please avoid typing commas (,) inside fields like name/location,
// because we're using comma as the separator in this beginner-friendly example.

#include <iostream>      // for input/output (cout, cin)
#include <fstream>       // for file streams (ifstream, ofstream)
#include <sstream>       // for stringstream (to build/parse CSV lines)
#include <vector>        // for std::vector to store donors in memory
#include <string>        // for std::string
#include <algorithm>     // for transform (uppercase), find_if
#include <cctype>        // for toupper, tolower
#include <limits>        // for numeric_limits

using namespace std;     // to avoid std:: prefix everywhere

// ---------- Configuration ----------
const string DATA_FILE = "donorsdonors_20.csv"; // our simple "database" file

// ---------- Helper: trim whitespace at both ends of a string ----------
static inline string trim(const string& s) {
    size_t start = s.find_first_not_of(" \t\r\n");
    if (start == string::npos) return "";
    size_t end = s.find_last_not_of(" \t\r\n");
    return s.substr(start, end - start + 1);
}

// ---------- Helper: convert a string to uppercase ----------
static inline string toUpper(string s) {
    transform(s.begin(), s.end(), s.begin(),
              [](unsigned char c){ return static_cast<char>(toupper(c)); });
    return s;
}

// ---------- Donor class: represents one donor record ----------
class Donor {
public:
    string name;              // donor's full name
    string bloodGroup;        // e.g., A+, O-, B+ ...
    string phone;             // contact number
    string location;          // city/area
    string lastDonationDate;  // e.g., 2025-08-01 (YYYY-MM-DD) or "N/A"
    bool   available;         // true = available, false = not available

    // Default constructor initializes available = true by default
    Donor() : available(true) {}

    // Convenience constructor
    Donor(const string& n, const string& bg, const string& ph,
          const string& loc, const string& last, bool avail)
        : name(n), bloodGroup(bg), phone(ph),
          location(loc), lastDonationDate(last), available(avail) {}

    // Serialize the donor to a single CSV line
    string toCSV() const {
        // IMPORTANT: This basic CSV assumes no commas inside fields.
        stringstream ss;
        ss << name << ","
           << bloodGroup << ","
           << phone << ","
           << location << ","
           << lastDonationDate << ","
           << (available ? "1" : "0");
        return ss.str();
    }

    // Parse a CSV line into a Donor. Returns true on success.
    static bool fromCSV(const string& line, Donor& out) {
        vector<string> parts;
        string token;
        stringstream ss(line);
        while (getline(ss, token, ',')) {
            parts.push_back(token);
        }
        if (parts.size() != 6) return false; // expecting exactly 6 fields

        out.name             = trim(parts[0]);
        out.bloodGroup       = trim(parts[1]);
        out.phone            = trim(parts[2]);
        out.location         = trim(parts[3]);
        out.lastDonationDate = trim(parts[4]);

        string avail = trim(parts[5]);
        out.available = (avail == "1" || toUpper(avail) == "TRUE"); // accept 1/0 or true/false
        return true;
    }

    // Pretty-print one donor
    void display() const {
        cout << "Name     : " << name << "\n"
             << "BloodGrp : " << bloodGroup << "\n"
             << "Phone    : " << phone << "\n"
             << "Location : " << location << "\n"
             << "Last Don : " << lastDonationDate << "\n"
             << "Status   : " << (available ? "Available" : "Not Available") << "\n";
    }
};

// ---------- Input helpers ----------

// Read a full line after showing a prompt; trims whitespace.
static string inputLine(const string& prompt) {
    cout << prompt;
    string s;
    getline(cin, s);
    return trim(s);
}

// Read an integer option safely (e.g., for menu choice).
static int inputInt(const string& prompt) {
    while (true) {
        cout << prompt;
        int x;
        if (cin >> x) {
            cin.ignore(numeric_limits<streamsize>::max(), '\n'); // consume leftover newline
            return x;
        } else {
            // Invalid input → clear error flags and discard the line
            cin.clear();
            cin.ignore(numeric_limits<streamsize>::max(), '\n');
            cout << "Invalid number. Try again.\n";
        }
    }
}

// Ask for a yes/no and return true for yes, false for no
static bool inputYesNo(const string& prompt) {
    while (true) {
        string ans = toUpper(inputLine(prompt + " (Y/N): "));
        if (ans == "Y" || ans == "YES") return true;
        if (ans == "N" || ans == "NO")  return false;
        cout << "Please type Y or N.\n";
    }
}

// ---------- Storage: load and save all donors ----------

// Load all donors from DATA_FILE into a vector
static vector<Donor> loadDonors() {
    vector<Donor> donors;
    ifstream fin(DATA_FILE);
    if (!fin) {
        // File might not exist initially; that's okay.
        return donors;
    }
    string line;
    while (getline(fin, line)) {
        line = trim(line);
        if (line.empty()) continue;
        Donor d;
        if (Donor::fromCSV(line, d)) {
            donors.push_back(d);
        }
        // else: skip malformed lines silently (beginner-friendly)
    }
    return donors;
}

// Save all donors from a vector to DATA_FILE (overwrites file)
static void saveDonors(const vector<Donor>& donors) {
    ofstream fout(DATA_FILE, ios::trunc); // overwrite
    for (const auto& d : donors) {
        fout << d.toCSV() << "\n";
    }
}

// ---------- Core Features ----------

// Register a new donor and save to file
static void addDonor(vector<Donor>& donors) {
    cout << "\n--- Register New Donor ---\n";
    string name        = inputLine("Full Name           : ");
    string bg          = toUpper(inputLine("Blood Group (e.g., A+, O-): "));
    string phone       = inputLine("Phone               : ");
    string location    = inputLine("Location (City/Area): ");
    string last        = inputLine("Last Donation Date (YYYY-MM-DD or N/A): ");
    bool   avail       = inputYesNo("Is donor currently available");

    Donor d(name, bg, phone, location, last, avail);

    // Optional: avoid duplicate by unique phone number
    auto dup = find_if(donors.begin(), donors.end(), [&](const Donor& x){
        return x.phone == d.phone;
    });
    if (dup != donors.end()) {
        cout << "A donor with this phone already exists. Updating that record instead.\n";
        *dup = d; // replace existing record
    } else {
        donors.push_back(d);
    }
    saveDonors(donors);
    cout << "Donor saved.\n";
}

// Show all donors in a table-ish format
static void showAll(const vector<Donor>& donors) {
    cout << "\n--- All Donors (" << donors.size() << ") ---\n";
    for (size_t i = 0; i < donors.size(); ++i) {
        cout << "[" << (i+1) << "]\n";
        donors[i].display();
        cout << "-------------------------\n";
    }
    if (donors.empty()) cout << "(No donors yet)\n";
}

// Search donors by blood group (optionally filter only available)
static void searchByBloodGroup(const vector<Donor>& donors) {
    cout << "\n--- Search by Blood Group ---\n";
    string bg = toUpper(inputLine("Enter Blood Group (e.g., A+, O-): "));
    bool onlyAvail = inputYesNo("Only show AVAILABLE donors");

    int found = 0;
    for (const auto& d : donors) {
        if (toUpper(d.bloodGroup) == bg) {
            if (!onlyAvail || (onlyAvail && d.available)) {
                cout << "\n";
                d.display();
                ++found;
            }
        }
    }
    if (found == 0) cout << "No donors found for blood group " << bg << ".\n";
}

// Search donors by location (case-insensitive substring match)
static void searchByLocation(const vector<Donor>& donors) {
    cout << "\n--- Search by Location ---\n";
    string key = toUpper(inputLine("Enter location keyword (e.g., Dhaka): "));
    bool onlyAvail = inputYesNo("Only show AVAILABLE donors");

    int found = 0;
    for (const auto& d : donors) {
        string locUp = toUpper(d.location);
        if (locUp.find(key) != string::npos) {
            if (!onlyAvail || (onlyAvail && d.available)) {
                cout << "\n";
                d.display();
                ++found;
            }
        }
    }
    if (found == 0) cout << "No donors found in location matching \"" << key << "\".\n";
}

// Update donor availability using phone as a unique identifier
static void updateAvailability(vector<Donor>& donors) {
    cout << "\n--- Update Donor Availability ---\n";
    string phone = inputLine("Enter donor PHONE to update: ");

    auto it = find_if(donors.begin(), donors.end(), [&](const Donor& d){
        return d.phone == phone;
    });
    if (it == donors.end()) {
        cout << "No donor found with phone: " << phone << "\n";
        return;
    }

    cout << "Current status: " << (it->available ? "Available" : "Not Available") << "\n";
    bool newStatus = inputYesNo("Set status to AVAILABLE");
    it->available = newStatus;
    saveDonors(donors);
    cout << "Availability updated and saved.\n";
}

// ---------- Menu UI ----------
static void showMenu() {
    cout << "\n=== Blood Donation Finder ===\n"
         << "1. Register New Donor\n"
         << "2. Search by Blood Group\n"
         << "3. Search by Location\n"
         << "4. Show All Donors\n"
         << "5. Update Donor Availability\n"
         << "6. Exit\n";
}

int main() {
    // Load donors from file at startup
    vector<Donor> donors = loadDonors();

    while (true) {
        showMenu();
        int choice = inputInt("Enter choice (1-6): ");
        switch (choice) {
            case 1:
                addDonor(donors);
                break;
            case 2:
                searchByBloodGroup(donors);
                break;
            case 3:
                searchByLocation(donors);
                break;
            case 4:
                showAll(donors);
                break;
            case 5:
                updateAvailability(donors);
                break;
            case 6:
                cout << "Goodbye!\n";
                return 0;
            default:
                cout << "Invalid choice. Try again.\n";
        }
    }
}
