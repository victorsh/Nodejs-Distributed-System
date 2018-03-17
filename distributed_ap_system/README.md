# AP-system
# Code Name: Persistent Bastard

Written By:
Victor Vahram Shahbazian vshahbaz
Justin Unverricht junverri

CAP implementation AP
Available:Nodes are always available
Partition:Fault tolerant

Each time a GET, PUT, DELETE is called, it is broadcasted to all nodes
that are still known to be alive.

If a node failes, it is put into the dead list. The dead list and the alive list
for each node are tested every 5 seconds to see if they have died or come back
to life.
