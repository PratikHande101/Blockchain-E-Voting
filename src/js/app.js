App = {
  web3Provider: null,
  contracts: {},
  account: '0x0',
  hasVoted: false,
  isLoggedIn: false,
  isAdmin: false,
  isResultDeclared: false,
  counter: 0,

  init: function() {
    return App.initWeb3();
  },

  initWeb3: function() {
  
    if (typeof web3 !== 'undefined') {
      App.web3Provider = web3.currentProvider;
      web3 = new Web3(web3.currentProvider);
    } else {
      App.web3Provider = new Web3.providers.HttpProvider('http://localhost:7545');
      web3 = new Web3(App.web3Provider);
    }
    return App.initContract();
  },

  initContract: function() {
    $.getJSON("Election.json", function(election) {
      App.contracts.Election = TruffleContract(election);

      App.contracts.Election.setProvider(App.web3Provider);

      App.listenForEvents();

      return App.render();
    });
  },

  listenForEvents: function() {
    App.contracts.Election.deployed().then(function(instance) {
      instance.votedEvent({}, {
        fromBlock: 'latest',
        toBlock: 'latest'
      }).watch(function(error, event) {
        console.log("event triggered", event)
        App.render();
      });
    });
  },

  render: function() {

    $(declareResult).click(function() {
      console.log("Declare result clicked");
      var ref = database.ref('resultDeclared');

      var data = {
        status: true,
      }

      ref.push(data);
      location.reload();
    })

    $(undoDeclare).click(function() {
      console.log("Undo declare result clicked");
      var ref = database.ref('resultDeclared');

      var data = {
        status: false,
      }

      ref.push(data);
      location.reload();
    })

    firebase.auth().onAuthStateChanged(function(user) {

      if (user) {
        isLoggedIn = true;
        if(user.phoneNumber == "+911234567890") {
          isAdmin = true;
          var resultDeclared;
          var database = firebase.database();
          var ref = database.ref('resultDeclared');
          ref.on('value', function (snapshot) {
            var resultFetch = snapshot.val();
            var keys = Object.keys(resultFetch);
            var k = keys[keys.length - 1];
            resultDeclared = resultFetch[k].status;
            console.log("Result Declared = ", resultDeclared);

            if(resultDeclared == true) {
              $("#declareResult").hide();
              $("#undoDeclare").show();
            } else {
              $("#declareResult").show();
              $("#undoDeclare").hide();
            }
          });

          $("#admin-lable").show();
        } else {
          isAdmin = false;
          var resultDeclared;
          var database = firebase.database();
          var ref = database.ref('resultDeclared');
          ref.on('value', function (snapshot) {
            var resultFetch = snapshot.val();
            var keys = Object.keys(resultFetch);
            var k = keys[keys.length - 1];
            resultDeclared = resultFetch[k].status;
            console.log("Result Declared = ", resultDeclared);
          });
          $("#admin-lable").hide();
          $("#declareResult").hide();
        }
        
      } else {
        // No user is signed in.
        isLoggedIn = false;
      }
    });
    var electionInstance;
    var loader = $("#loader");
    var content = $("#content");
    var login = $("#Login");

    loader.hide();
    content.hide();

    // Load account data
    web3.eth.getCoinbase(function(err, account) {
      if (err === null) {
        App.account = account;
        $("#accountAddress").html("Your Account: " + account);
      }
    });

    // Load contract data
    App.contracts.Election.deployed().then(function(instance) {
      console.log("User log in = ", isLoggedIn);
      console.log("Is Admin = ", isAdmin);


      //console.log(resultDeclared);

      // function gotData(data) {
      //   //console.log(data.val());
      //   var resultFetch = data.val();
      //   var keys = Object.keys(resultFetch);
      //   //console.log(keys);
      //   var k = keys[keys.length - 1];
      //   resultDeclared = resultFetch[k].status;
      //   console.log("Result Declared = ", resultDeclared);
      //   App.isResultDeclared = resultDeclared;
      //   console.log("Global = ", App.isResultDeclared);
      // }

      // function errData(data) {
      //   console.log('ERROR!')
      //   console.log(data)
      // }

      // console.log("Global = ", App.isResultDeclared);


      if(isLoggedIn == true) {
        login.hide();
        content.show();
      } else {
        login.show();
        content.hide();
      }
      electionInstance = instance;
      return electionInstance.candidatesCount();
    }).then(function(candidatesCount) {

      //******************//
      // Store all promised to get the candidate info
      const promises = [];
      for (var i = 1; i <= candidatesCount; i++) {
        promises.push(electionInstance.candidates(i));
      } 
      console.log(promises);
      // Once all candidates are received, add to dom
      Promise.all(promises).then((candidates) => {
        var candidatesResults = $("#candidatesResults");
        candidatesResults.empty();

        var candidatesSelect = $('#candidatesSelect');
        candidatesSelect.empty();


        candidates.forEach(candidate => {
          var id = candidate[0];
          var name = candidate[1];
          var voteCount = candidate[2];

          // Render candidate Result
          if (isAdmin == true){
            var candidateTemplate = "<tr><th>" + id + "</th><td>" + name + "</td><td>" + voteCount + "</td></tr>"
            candidatesResults.append(candidateTemplate);
            $("#candidateDropDown").hide()
          } else {
            var resultDeclared;
            var database = firebase.database();
            var ref = database.ref('resultDeclared');
            ref.on('value', function (snapshot) {
              var resultFetch = snapshot.val();
              var keys = Object.keys(resultFetch);
              var k = keys[keys.length - 1];
              resultDeclared = resultFetch[k].status;
              console.log("Result Declared = ", resultDeclared);

              //var rowId = "rowId";

              if(resultDeclared == true) {
                var candidateTemplate = "<tr id= row"+ App.counter +"><th>" + id + "</th><td>" + name + "</td><td>" + voteCount + "</td></tr>"
                candidatesResults.append(candidateTemplate);
                //$("#candidateDropDown").show()
                // Render candidate ballot option
                // var candidateOption = "<option id = option"+ App.counter +" value='" + id + "' >" + name + "</ option>"
                // candidatesSelect.append(candidateOption);
                App.counter += 1;
              } else {
                var candidateTemplate = "<tr id= row"+ App.counter +"><th>" + id + "</th><td>" + name + "</td><td>" + "Yet to be declared" + "</td></tr>"
                candidatesResults.append(candidateTemplate);
                //$("#candidateDropDown").show()
                // Render candidate ballot option
                // var candidateOption = "<option id = option"+ App.counter +" value='" + id + "' >" + name + "</ option>"
                // candidatesSelect.append(candidateOption);
                App.counter += 1;
              }
            });
            
            $("#candidateDropDown").show()
            // // Render candidate ballot option
            var candidateOption = "<option value='" + id + "' >" + name + "</ option>"
            candidatesSelect.append(candidateOption);
          }
        })
      });

      // var candidatesResults = $("#candidatesResults");
      //   candidatesResults.empty();

      //   var candidatesSelect = $('#candidatesSelect');
      //   candidatesSelect.empty();

      // for (var i = 1; i <= candidatesCount; i++) {
      //   electionInstance.candidates(i).then(function(candidate) {
      //     var id = candidate[0];
      //     var name = candidate[1];
      //     var voteCount = candidate[2];

      //     // Render candidate Result
      //     var candidateTemplate = "<tr><th>" + id + "</th><td>" + name + "</td><td>" + voteCount + "</td></tr>"
      //     candidatesResults.append(candidateTemplate);

      //     // Render candidate ballot option
      //     var candidateOption = "<option value='" + id + "' >" + name + "</ option>"
      //     candidatesSelect.append(candidateOption);
      //   });
      // }
      return electionInstance.voters(App.account);
    }).then(function(hasVoted) {
      // Do not allow a user to vote 
      if(hasVoted) {
        $('#candidateDropDown').hide();
      }
      loader.hide();
      //content.show();
    }).catch(function(error) {
      console.warn(error);
    });
  },

  castVote: function() {
    var candidateId = $('#candidatesSelect').val();
    App.contracts.Election.deployed().then(function(instance) {
      return instance.vote(candidateId, { from: App.account });
    }).then(function(result) {
      // Wait for votes to update
      $("#content").hide();
      $("#loader").show();
      App.hasVoted = true;
    }).catch(function(err) {
      console.error(err);
    });
  }
};

$(function() {
  $(window).load(function() {
    App.init();
  });
});
