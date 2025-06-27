import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Button,
  Paper,
  Typography,
  Avatar,
  Alert,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  CircularProgress,
  Divider,
} from "@mui/material";
import { getCookie } from "../utils/cookieUtils";

const usersPerPage = 5;

export default function UserList() {
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState(null);
  const [userPhotos, setUserPhotos] = useState({});
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [pageLinks, setPageLinks] = useState([
    `https://graph.microsoft.com/v1.0/users?$top=${usersPerPage}`,
  ]);

  const fetchUsers = useCallback(
    async (pageIndex) => {
      setUsersLoading(true);
      setUsersError(null);
      const accessToken = getCookie("msAccessToken");

      if (!accessToken) {
        setUsersError("No access token found.");
        setUsersLoading(false);
        return;
      }

      const url = pageLinks[pageIndex];
      if (!url) {
        setUsersError("Invalid page link.");
        setUsersLoading(false);
        return;
      }

      try {
        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error?.message ||
              `API request failed with status ${response.status}`
          );
        }

        const data = await response.json();
        setUsers(data.value);

        const nextLink = data["@odata.nextLink"];
        if (nextLink && pageIndex === pageLinks.length - 1) {
          setPageLinks((prev) => [...prev, nextLink]);
        } else if (!nextLink && pageIndex < pageLinks.length - 1) {
          setPageLinks((prev) => prev.slice(0, pageIndex + 1));
        }
      } catch (err) {
        console.error("Error fetching users:", err);
        setUsersError(
          `Failed to fetch users: ${err.message}. Ensure the application has 'User.Read.All' API permissions and admin consent has been granted.`
        );
      } finally {
        setUsersLoading(false);
      }
    },
    [pageLinks]
  );

  const fetchUserPhotos = useCallback(async () => {
    const accessToken = getCookie("msAccessToken");
    if (!users.length || !accessToken) {
      return;
    }

    const newPhotos = {};
    const usersToFetch = users.filter((u) => userPhotos[u.id] === undefined);

    if (usersToFetch.length === 0) return;

    await Promise.all(
      usersToFetch.map(async (user) => {
        try {
          const response = await fetch(
            `https://graph.microsoft.com/v1.0/users/${user.id}/photo/$value`,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            }
          );
          if (response.ok) {
            const blob = await response.blob();
            newPhotos[user.id] = URL.createObjectURL(blob);
          } else {
            newPhotos[user.id] = null;
          }
        } catch (err) {
          console.warn(
            `Could not fetch photo for user ${user.displayName}:`,
            err
          );
          newPhotos[user.id] = null;
        }
      })
    );
    setUserPhotos((prevPhotos) => ({ ...prevPhotos, ...newPhotos }));
  }, [users, userPhotos]);

  useEffect(() => {
    fetchUsers(currentPageIndex);
  }, [currentPageIndex, fetchUsers]);

  useEffect(() => {
    if (users.length > 0) {
      fetchUserPhotos();
    }
  }, [users, fetchUserPhotos]);

  const handlePrevPage = () => {
    if (currentPageIndex > 0) {
      setCurrentPageIndex((i) => i - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPageIndex < pageLinks.length - 1) {
      setCurrentPageIndex((i) => i + 1);
    }
  };

  return (
    <Paper elevation={6} sx={{ p: 2, mt: 3, width: "100%" }}>
      <Typography variant="h6" gutterBottom>
        Users in Tenant
      </Typography>
      {usersLoading ? (
        <Box sx={{ display: "flex", justifyContent: "center", p: 2 }}>
          <CircularProgress />
        </Box>
      ) : usersError ? (
        <Alert severity="error">{usersError}</Alert>
      ) : (
        <>
          <List>
            {users.map((user, index) => (
              <React.Fragment key={user.id}>
                <ListItem alignItems="flex-start">
                  <ListItemAvatar>
                    <Avatar src={userPhotos[user.id]} alt={user.displayName}>
                      {user.displayName ? user.displayName.charAt(0) : ""}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={user.displayName}
                    secondary={user.mail || user.userPrincipalName}
                  />
                </ListItem>
                {index < users.length - 1 && (
                  <Divider variant="inset" component="li" />
                )}
              </React.Fragment>
            ))}
          </List>
          {users.length > 0 &&
            (currentPageIndex > 0 || pageLinks.length > 1) && (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mt: 2,
                }}
              >
                <Button
                  onClick={handlePrevPage}
                  disabled={currentPageIndex === 0}
                >
                  Previous
                </Button>
                <Typography variant="body2">
                  Page {currentPageIndex + 1}
                </Typography>
                <Button
                  onClick={handleNextPage}
                  disabled={currentPageIndex >= pageLinks.length - 1}
                >
                  Next
                </Button>
              </Box>
            )}
        </>
      )}
    </Paper>
  );
}
