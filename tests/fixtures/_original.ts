function greet() {
  console.log("hello");
}

function fail() {
  throw new Error("fail");
}

greet();
fail();
