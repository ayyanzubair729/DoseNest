import { useCallback, useEffect, useState } from "react";
import familyMembersApi from "../services/familyMembers";

export default function useFamilyMembers() {
  const [familyMembers, setFamilyMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setFamilyMembers(await familyMembersApi.list());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { familyMembers, loading, error, reload: load };
}
