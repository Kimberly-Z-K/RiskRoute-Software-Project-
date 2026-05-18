import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Image,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";

export default function Profile() {
  const [editing, setEditing] = useState(true);

  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [phone, setPhone] = useState("");

  const [saved, setSaved] = useState(null);

  // SYSTEM CONTROLLED (not editable)
  const vehicle = "Volvo FH Truck";
  const plate = "CA 123-456";
  const rating = "4.8 ⭐";
  const trips = 128;

  const handleSave = () => {
    setSaved({ name, surname, phone });
    setEditing(false);
  };

  const handleEdit = () => {
    setEditing(true);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 120 }}
      showsVerticalScrollIndicator={false}
    >
      {/* HEADER */}
      <View style={styles.header} />

      <View style={styles.card}>
        {/* PROFILE IMAGE */}
        <Image
          source={{
            uri: "https://cdn-icons-png.flaticon.com/512/3135/3135715.png",
          }}
          style={styles.image}
        />

        {/* IF EDITING → SHOW FORM */}
        {editing ? (
          <>
            <Text style={styles.title}>Enter Your Details</Text>

            <TextInput
              placeholder="Name"
              value={name}
              onChangeText={setName}
              style={styles.input}
            />

            <TextInput
              placeholder="Surname"
              value={surname}
              onChangeText={setSurname}
              style={styles.input}
            />

            <TextInput
              placeholder="Phone Number"
              value={phone}
              onChangeText={setPhone}
              style={styles.input}
            />

            <TouchableOpacity style={styles.button} onPress={handleSave}>
              <Text style={styles.buttonText}>Save Profile</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            {/* PROFILE VIEW */}
            <Text style={styles.name}>
              {saved.name} {saved.surname}
            </Text>

            <Text style={styles.rating}>{rating}</Text>

            {/* PERSONAL INFO */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Personal Details</Text>

              <Text style={styles.label}>Phone</Text>
              <Text style={styles.value}>{saved.phone}</Text>
            </View>

            {/* VEHICLE (NOT EDITABLE) */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Vehicle Info</Text>

              <Text style={styles.label}>Vehicle</Text>
              <Text style={styles.value}>{vehicle}</Text>

              <Text style={styles.label}>Plate</Text>
              <Text style={styles.value}>{plate}</Text>
            </View>

            {/* STATS */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Performance</Text>

              <Text style={styles.value}>Trips: {trips}</Text>
            </View>

            {/* EDIT BUTTON */}
            <TouchableOpacity style={styles.button} onPress={handleEdit}>
              <Text style={styles.buttonText}>Edit Profile</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f6f8",
  },

  header: {
    height: 160,
    backgroundColor: "#0077b6",
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },

  card: {
    backgroundColor: "#fff",
    marginTop: -60,
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    elevation: 5,
  },

  image: {
    width: 90,
    height: 90,
    borderRadius: 45,
    marginTop: -50,
    borderWidth: 3,
    borderColor: "#fff",
  },

  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
  },

  name: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 10,
  },

  rating: {
    color: "#f4a261",
    fontWeight: "bold",
    marginTop: 5,
  },

  input: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 10,
    borderRadius: 10,
    marginTop: 10,
  },

  section: {
    width: "100%",
    marginTop: 15,
    padding: 15,
    backgroundColor: "#e9f5ff",
    borderRadius: 12,
  },

  sectionTitle: {
    fontWeight: "bold",
    marginBottom: 10,
    color: "#0077b6",
  },

  label: {
    fontSize: 12,
    color: "#666",
    marginTop: 8,
  },

  value: {
    fontSize: 14,
    color: "#333",
  },

  button: {
    marginTop: 20,
    backgroundColor: "#0077b6",
    padding: 12,
    borderRadius: 10,
    width: "100%",
    alignItems: "center",
  },

  buttonText: {
    color: "#fff",
    fontWeight: "bold",
  },
});