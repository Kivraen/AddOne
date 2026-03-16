import { Redirect } from "expo-router";

export default function FriendsRoute() {
  return <Redirect href={{ pathname: "/", params: { tab: "friends" } }} />;
}
