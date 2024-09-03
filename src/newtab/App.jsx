import React from "react";
import { Provider } from "mobx-react";
import stores from "~/stores";
import ChiefSecurityAssurance from "~/components/ChiefSecurityAssurance";
import Tower from "~/view/Tower";
import Routes from "~/routes";
import "./app.scss";

function App() {

  return (
    <Provider {...stores}>
      <ChiefSecurityAssurance>
        <Tower>
          <Routes />
        </Tower>
      </ChiefSecurityAssurance>
    </Provider>
  );
}

export default App;
